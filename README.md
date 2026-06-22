# Shelf Finder

PWA mobile-first para hacer sets/resets de tienda más rápido: cargas el planogram (foto, texto pegado o manual), revisas los datos antes de guardarlos, y luego buscas cualquier producto por UPC/nombre o escaneando el código de barras para saber a qué shelf va. Cada trabajo vive 48 horas y se borra solo.

## Arquitectura

Todo corre 100% en el navegador, sin backend:

```
UI (pages/components)
   │  llama a
   ▼
db/*Repo.js  (jobsRepo, shelvesRepo, productsRepo)
   │  usan
   ▼
db/db.js → IndexedDB (vía la librería "idb")

lib/parseSheetText.js   → convierte texto (de OCR o pegado) en filas editables
lib/ocr.js              → Tesseract.js: imagen → texto
lib/barcode.js          → BarcodeDetector nativo o ZXing (fallback) → UPC
lib/upc.js              → normaliza UPC y genera variantes UPC-A/EAN-13
db/cleanup.js           → barre jobs > 48h en un intervalo + al volver a la app
```

No hay estado global tipo Redux: cada página carga lo que necesita de IndexedDB y lo vuelve a leer después de cada cambio (`refresh()`). Con cientos de productos por trabajo esto es más que suficiente en un teléfono, y evita la complejidad de mantener un store sincronizado con la base local.

### Modelo de datos

Tres object stores en IndexedDB:

- **jobs**: `{ id, name, createdAt }`. El tiempo de borrado (`createdAt + 48h`) se calcula al vuelo, no se guarda como campo separado.
- **shelves**: `{ id, jobId, name, normalizedName, createdAt }`. `normalizedName` (trim + lowercase) es la clave para que "Shelf 3" y "shelf 3 " no generen un shelf duplicado al fotografiar la misma sección dos veces. `findOrCreateShelf(jobId, nombre)` es el único punto de entrada para crear productos: siempre busca primero por `[jobId, normalizedName]` antes de crear.
- **products**: `{ id, jobId, shelfId, name, upc, createdAt }`. El UPC se guarda ya normalizado (solo dígitos).

Separar `shelves` de `products` (en vez de guardar el shelf como string suelto en cada producto) permite crear un shelf vacío manualmente y que aparezca en la lista aunque no tenga productos todavía.

### Borrado automático (48h)

`db/cleanup.js` corre un sweep que borra cualquier job con `Date.now() - createdAt > 48h` (cascada a sus shelves y productos). Se ejecuta:
- Al abrir la app.
- Cada 60s mientras está abierta.
- Cuando la pestaña vuelve a estar visible (cubre el caso del teléfono dormido en el bolsillo).

No existe un botón de "Terminé esta tienda" a propósito — es la única forma de "cerrar" un trabajo, tal como se pidió.

## Flujo de usuario

```
Home (lista de trabajos + tiempo restante)
 └─ Nuevo trabajo → nombre → entra directo al trabajo

Job (buscador + acciones rápidas + lista por shelf)
 ├─ Escanear → cámara → UPC detectado → "Producto encontrado: Shelf X"
 ├─ Agregar → hoja de opciones:
 │    ├─ Tomar foto (OCR) → texto detectado (editable) → Revisión → Guardar
 │    ├─ Pegar texto → Revisión → Guardar
 │    ├─ Agregar manual → shelf/nombre/UPC → Guardar (o "Guardar y agregar otro")
 │    └─ Crear shelf vacío
 └─ Tocar un producto → editar shelf/nombre/UPC o eliminar
```

La pantalla de **Revisión** es el punto en común de OCR y texto pegado: nunca se escribe a IndexedDB directamente desde la foto o el texto. Siempre se pasa primero por una tabla editable (`ReviewTable`) donde se puede corregir, borrar o agregar filas antes de tocar "Confirmar y guardar". Ahí es también donde se resuelve la regla de "no duplicar shelf": al guardar, cada fila busca o crea su shelf por nombre normalizado.

## Convertir fotos en datos revisables: opciones de OCR

Esto es lo que se evaluó para el paso "foto → texto":

| Opción | Cómo funciona | Pros | Contras |
|---|---|---|---|
| **Tesseract.js (elegida para v1)** | OCR 100% en el dispositivo, vía WebAssembly. | Gratis, funciona sin backend, los datos no salen del teléfono (privacidad), no depende de un servicio de pago. | Precisión media-baja con fotos torcidas/con poca luz; el primer uso necesita descargar ~5-10MB de datos del idioma (se cachea con el service worker para usos posteriores); más lento que un OCR en la nube (unos segundos por foto). |
| **OCR en la nube** (Google Cloud Vision, AWS Textract, Azure Document Intelligence) | La foto se sube a un endpoint propio que llama al servicio. | Mucha mejor precisión, especialmente con texto pequeño o manuscrito; más rápido. | Requiere backend propio (costo, mantenimiento, autenticación), depende de tener señal/datos en el pasillo, tiene costo por imagen, y la foto sale del dispositivo. |
| **Híbrido** | Tesseract.js por defecto; si el usuario marca el resultado como "malo", se ofrece reintentar contra un endpoint en la nube. | Lo mejor de ambos: gratis y rápido en el caso común, con una salida de mayor precisión cuando se necesita. | Más complejo de construir; requiere ese backend para el camino de respaldo. |

Para v1 se implementó **Tesseract.js**, porque el caso de uso (parado en el pasillo, a veces sin buena señal, sin querer pagar por imagen) favorece que todo corra local. El punto de integración está aislado en `src/lib/ocr.js` (`recognizeSheetText(imagen)` devuelve el texto plano) — cambiar a un OCR externo más adelante es reemplazar esa única función, sin tocar el resto de la app, ya que lo que consume el resultado (`parseSheetText`) solo necesita un string de texto.

Independientemente del motor de OCR, la pantalla de "Foto" deja el texto reconocido en un `<textarea>` editable **antes** de parsearlo a filas — así un error de OCR (un UPC mal leído, una línea cortada) se corrige en texto plano antes de llegar a la tabla de revisión.

### Por qué nunca se descarta una línea silenciosamente

`parseSheetText` reconoce líneas tipo `Shelf 3:` como encabezado y líneas tipo `<nombre> <6 a 14 dígitos>` como producto. Cualquier línea que no calce en ese patrón (ruido típico de OCR) se agrega igual como fila editable con el UPC vacío, en vez de perderse — así el usuario decide si la corrige o la borra en la pantalla de revisión, nunca pasa inadvertida.

## Escaneo de código de barras

`src/lib/barcode.js` intenta primero la API nativa `BarcodeDetector` (rápida, sin descargas). **Safari/iOS no la implementa** a la fecha, así que en iPhone se usa automáticamente el fallback con `@zxing/browser`, que decodifica el video cuadro por cuadro en JS/WASM. La cámara se pide con `facingMode: 'environment'` (cámara trasera).

UPC-A (12 dígitos) y EAN-13 (13 dígitos) a veces representan el mismo código con/sin el cero inicial — por eso tanto la búsqueda manual como el escaneo prueban las variantes (`lib/upc.js`) antes de decir "no encontrado".

## Estructura de archivos

```
shelf-finder/
├─ index.html
├─ vite.config.js          # plugin PWA: manifest + service worker + cache de Tesseract CDN
├─ scripts/generate-icons.mjs
├─ public/
│  ├─ icons/icon-192.png, icon-512.png, maskable-512.png
│  └─ apple-touch-icon.png
└─ src/
   ├─ main.jsx              # HashRouter + render
   ├─ App.jsx                # rutas + scheduler de limpieza 48h
   ├─ index.css              # diseño mobile-first (botones grandes, una mano)
   ├─ db/
   │  ├─ db.js               # apertura de IndexedDB + esquema
   │  ├─ jobsRepo.js
   │  ├─ shelvesRepo.js
   │  ├─ productsRepo.js
   │  └─ cleanup.js
   ├─ lib/
   │  ├─ parseSheetText.js   # texto → filas {shelf, name, upc}
   │  ├─ ocr.js              # Tesseract.js
   │  ├─ barcode.js          # BarcodeDetector + fallback ZXing
   │  ├─ upc.js
   │  ├─ shelfSort.js
   │  └─ time.js
   ├─ hooks/useCountdown.js
   ├─ context/ToastContext.jsx
   ├─ components/
   │  ├─ BigButton.jsx, IconButton.jsx, SearchBar.jsx, CountdownChip.jsx
   │  ├─ ShelfGroup.jsx, ProductRow.jsx, ProductEditModal.jsx
   │  ├─ ReviewTable.jsx, AddOptionsSheet.jsx, BarcodeScannerView.jsx
   │  └─ EmptyState.jsx
   └─ pages/
      ├─ HomePage.jsx, NewJobPage.jsx, JobPage.jsx
      ├─ AddManualPage.jsx, PasteTextPage.jsx, PhotoOcrPage.jsx
      ├─ ReviewPage.jsx, ScanPage.jsx
```

## Correr el proyecto

```bash
npm install
npm run dev       # http://localhost:5173 (o IP de la red para probar en el iPhone)
npm run build     # genera dist/ con manifest + service worker
npm run preview   # sirve dist/ para probar el build de producción
npm run icons     # regenera los PNG de public/icons (no requiere ninguna librería de imágenes)
```

### Instalar en el iPhone 15 Pro Max

1. Servir la app por HTTPS (requisito de Safari para cámara + PWA instalable; en desarrollo, `localhost` cuenta como seguro, pero para probar en el teléfono real se necesita HTTPS o exponerlo vía una herramienta de túnel).
2. Abrir la URL en Safari.
3. Compartir → "Agregar a pantalla de inicio".
4. Abrirla desde el ícono: corre en modo standalone, sin la barra de Safari.

## Limitaciones conocidas / próximos pasos

- Los íconos del manifest son un placeholder geométrico generado por script (`scripts/generate-icons.mjs`), pensado para reemplazarse por un ícono de marca real.
- El primer uso de OCR en cada instalación necesita conexión a internet para descargar el modelo de idioma de Tesseract (luego queda cacheado por el service worker).
- No hay un campo de "posición dentro del shelf" todavía — el modelo de `products` ya tiene espacio para agregarlo (`note`/`position`) sin cambios de esquema mayores si se necesita más adelante.

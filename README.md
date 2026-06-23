# Shelf Finder

PWA mobile-first para hacer sets/resets de tienda más rápido: importás el planogram real (foto, texto pegado o manual), revisás los datos en una tabla editable antes de guardarlos, y después buscás cualquier producto por UPC completo/parcial, nombre, posición o shelf para saber dónde va y marcarlo encontrado. Cada trabajo vive 48 horas y se borra solo.

## Arquitectura

El backend es **IndexedDB** (vía la librería [`idb`](https://www.npmjs.com/package/idb)), 100% local al dispositivo — no hay servidor, no hay login, no hay costo por uso. Esto cumple a propósito con "no usar Firebase/Supabase todavía": no hace falta una cuenta en la nube para que la app funcione, y nada sale del teléfono.

```
UI (pages/components)
   │  llama a
   ▼
db/*Repo.js  (jobsRepo, shelvesRepo, productsRepo, photosRepo, searchHistoryRepo)
   │  usan
   ▼
db/db.js → IndexedDB ('shelf-finder-db', vía idb) + pub/sub en memoria para que las pantallas se sientan "en vivo"

lib/parseSheetText.js   → convierte texto (de OCR o pegado) en filas editables con todas las columnas del planogram
lib/reviewAlerts.js     → detecta filas con datos sospechosos antes de guardar (UPC vacío, posición duplicada, etc.)
lib/report.js           → arma el desglose por shelf y el texto plano del reporte final
lib/ocr.js              → Tesseract.js: imagen → texto
lib/barcode.js          → BarcodeDetector nativo o ZXing (fallback) → UPC
lib/upc.js              → normaliza UPC y genera variantes UPC-A/EAN-13
lib/shelfSort.js        → orden de shelves por nombre y de productos por posición numérica
db/cleanup.js           → barre (en este dispositivo) jobs > 48h en un intervalo + al volver a la app
```

No hay estado global tipo Redux: `JobPage` se suscribe (`subscribeJob`/`subscribeShelves`/`subscribeProducts`) a un pub/sub en memoria (`db/db.js`) que se dispara cada vez que un repo escribe — así un cambio hecho desde **esta misma pestaña** (otra pantalla, otro componente) aparece sin recargar. Como todo es local a este dispositivo, hoy eso no cruza a otro celular; el código corto de 6 letras de cada trabajo ya existe y queda reservado como el enganche para cuando "Modo equipo" (sync entre dispositivos) se implemente más adelante — ver la nota en `db/jobsRepo.js`.

### Modelo de datos

`getDb()` (`src/db/db.js`) abre una sola base IndexedDB con estos object stores:

- **jobs** `{ id, name, createdAt }`. El **id es el código de 6 letras** que se muestra en el trabajo (alfabeto sin 0/O/1/I para que no se confunda al dictarlo). El vencimiento (`createdAt + 48h`) se calcula al vuelo, no se guarda como campo separado.
- **shelves** `{ id, jobId, name, normalizedName, createdAt }`, con un índice único `[jobId, normalizedName]` — así `findOrCreateShelf(jobId, nombre)` nunca duplica un shelf que ya existe con ese nombre (ignorando mayúsculas/espacios), sea que venga de un import masivo o de "Crear shelf vacío".
- **products** `{ id, jobId, shelfId, description, upc, position, stockcode, size, uom, facings, status, updatedBy, updatedAt, createdAt }` — el esquema completo de una fila de planogram real (`Position | UPC | Long Description | Stockcode | Size | UOM | Facings`), más `status` (`'pending' | 'found' | 'not_found'`) y quién/cuándo lo marcó. Productos guardados antes de que existiera este esquema (solo `{shelfId, name, upc}`) se siguen leyendo bien: `normalizeProduct()` en `productsRepo.js` les rellena cada campo nuevo con un default y deriva `description`/`name` como alias del mismo valor.
- **photos** `{ id, jobId, blob, createdAt }` — fotos de referencia (no se usan como input de OCR), comprimidas a JPEG antes de guardarse (`photosRepo.js`).
- **searchHistory** `{ id, jobId, productId, description, upc, shelfName, createdAt }` — las últimas 10 búsquedas que resolvieron a un solo producto, por trabajo.

Separar `shelves` de `products` permite crear un shelf vacío manualmente y que aparezca en la lista aunque no tenga productos todavía. Todo lo de un trabajo (shelves, products, photos, searchHistory) se borra en cascada cuando el trabajo se borra o vence — ver `deleteAllForJob` en `db/db.js`.

### Importar el planogram real

`lib/parseSheetText.js` reconoce encabezados de shelf (`Shelf 12`, `Shelf: 12, Length: ...`) y filas de reporte impreso con columnas posicionales (`28  73891202239  BOSTON MARKET SWEET & SOUR CHIC  037739  14.00  OZ  1` → posición, UPC, descripción, stockcode, tamaño, unidad, facings), además de líneas simples tipeadas a mano (`<nombre> <UPC>`). Cualquier línea que no calce en ningún patrón (típico de ruido de OCR) se agrega igual como fila editable con los campos vacíos en vez de perderse — el usuario decide en la Revisión si la corrige o la borra.

### Revisión editable antes de guardar

Ninguna importación (foto, texto pegado o manual masivo) escribe directo a IndexedDB. Siempre pasa primero por `ReviewPage`/`ReviewTable`, una tabla editable donde cada fila tiene Shelf, Posición, Descripción, UPC, Stockcode, Tamaño/Unidad/Facings, y un botón para borrarla. `lib/reviewAlerts.js` calcula, mirando todas las filas juntas (no cada una aislada, porque detectar UPC/posición duplicados requiere contar entre filas), chips de alerta no bloqueantes:

- **Críticas** (rojo): UPC vacío, UPC con letras, Shelf faltante, Descripción vacía.
- **Advertencia** (ámbar): UPC demasiado corto, UPC duplicado, Posición faltante, Posición duplicada dentro del mismo shelf.

Las alertas nunca bloquean "Confirmar y guardar" — son una guía visual, no una validación dura. Al guardar, cada fila busca o crea su shelf por nombre normalizado, así que un mismo shelf nunca se duplica venga de donde venga.

### Borrado automático (48h)

`db/cleanup.js` corre un sweep que borra cualquier job *que este dispositivo conozca* con `Date.now() - createdAt > 48h` (cascada a shelves, products, photos y searchHistory). Se ejecuta al abrir la app, cada 60s mientras está abierta, y cuando la pestaña vuelve a estar visible (cubre el caso del teléfono dormido en el bolsillo). No existe un botón de "Terminé esta tienda" a propósito — el vencimiento es la única forma de "cerrar" un trabajo.

## Flujo de usuario

```
Home (lista de trabajos + tiempo restante)
 └─ Nuevo trabajo → nombre → entra directo al trabajo

Job (buscador + acciones rápidas + progreso + búsquedas recientes + lista por shelf)
 ├─ Buscar → UPC completo/parcial (últimos 4-6 dígitos), descripción, posición o shelf
 │    └─ Un solo resultado → tarjeta grande (ProductMatchCard) con todo el detalle y ✅/❌
 ├─ Escanear → cámara → UPC detectado → producto + shelf + posición, y queda en búsquedas recientes
 ├─ Agregar → hoja de opciones:
 │    ├─ Tomar foto (OCR) → texto detectado (editable) → Revisión → Guardar
 │    ├─ Pegar texto → Revisión → Guardar
 │    ├─ Agregar manual → shelf/posición/descripción/UPC → Guardar (o "Guardar y agregar otro")
 │    ├─ Fotos de referencia → galería de fotos del set/planogram (solo visual)
 │    └─ Crear shelf vacío
 ├─ Tocar el resumen de progreso → Reporte final (stats + desglose por shelf + lista de no encontrados, copiable)
 └─ Tocar un producto → editar cualquier campo o eliminarlo
```

### Búsqueda

Un solo campo de texto cubre todo: UPC completo, cualquier substring de UPC (lo que cubre buscar por los últimos 4/5/6 dígitos, ya que eso es justo un substring final), descripción, posición y nombre de shelf. Cuando el resultado se reduce a un único producto, `JobPage` muestra `ProductMatchCard` — una tarjeta grande con descripción, UPC, shelf, posición, tamaño/unidad, facings y los botones ✅/❌, pensada para verse de un vistazo parado en el pasillo. Esa búsqueda exitosa también se guarda en el historial (`searchHistoryRepo.js`), que aparece como chips tocables debajo del buscador cuando el campo está vacío.

### Progreso y reporte

`JobPage` muestra una barra compacta (`ProgressSummary`) con encontrados/total/porcentaje; tocarla navega a `/jobs/:jobId/report`, donde está el desglose completo (por shelf, y la lista de no encontrados) más un botón para copiar todo como texto plano (`lib/report.js`) — listo para pegar en un chat o correo, con Trabajo/Usuario/Fecha, stats y el formato `UPC - Descripción - Shelf - Posición` para cada no encontrado. Dentro de cada shelf (`ShelfGroup`), los productos se ordenan por posición numérica y el título del shelf muestra su propio "encontrados/total".

## Convertir fotos en datos revisables: opciones de OCR

Esto es lo que se evaluó para el paso "foto → texto":

| Opción | Cómo funciona | Pros | Contras |
|---|---|---|---|
| **Tesseract.js (elegida para v1)** | OCR 100% en el dispositivo, vía WebAssembly. | Gratis, funciona sin backend, los datos no salen del teléfono (privacidad), no depende de un servicio de pago. | Precisión media-baja con fotos torcidas/con poca luz; el primer uso necesita descargar ~5-10MB de datos del idioma (se cachea con el service worker para usos posteriores); más lento que un OCR en la nube (unos segundos por foto). |
| **OCR en la nube** (Google Cloud Vision, AWS Textract, Azure Document Intelligence) | La foto se sube a un endpoint propio que llama al servicio. | Mucha mejor precisión, especialmente con texto pequeño; más rápido. | Requiere backend propio (costo, mantenimiento), depende de tener señal/datos en el pasillo, tiene costo por imagen, y la foto sale del dispositivo. |
| **Híbrido** | Tesseract.js por defecto; si el resultado es malo, reintentar contra un endpoint en la nube. | Lo mejor de ambos. | Más complejo de construir; requiere ese backend para el camino de respaldo. |

Para v1 se implementó **Tesseract.js**, porque el caso de uso (parado en el pasillo, a veces sin buena señal, sin querer pagar por imagen) favorece que todo corra local. El punto de integración está aislado en `src/lib/ocr.js` (`recognizeSheetText(imagen)` devuelve el texto plano) — cambiar a un OCR externo más adelante es reemplazar esa única función, sin tocar el resto de la app, ya que lo que consume el resultado (`parseSheetText`) solo necesita un string de texto.

Independientemente del motor de OCR, la pantalla de "Foto" deja el texto reconocido en un `<textarea>` editable **antes** de parsearlo a filas — así un error de OCR se corrige en texto plano antes de llegar a la tabla de revisión.

## Escaneo de código de barras

`src/lib/barcode.js` intenta primero la API nativa `BarcodeDetector` (rápida, sin descargas). **Safari/iOS no la implementa** a la fecha, así que en iPhone se usa automáticamente el fallback con `@zxing/browser`, que decodifica el video cuadro por cuadro en JS/WASM. La cámara se pide con `facingMode: 'environment'` (cámara trasera).

UPC-A (12 dígitos) y EAN-13 (13 dígitos) a veces representan el mismo código con/sin el cero inicial — por eso tanto la búsqueda manual como el escaneo prueban las variantes (`lib/upc.js`) antes de decir "no encontrado".

## Fotos de referencia

Visual-only: sirven para que el equipo vea cómo debería quedar el shelf armado, no se usan como input de OCR. Se comprimen a JPEG (máx. 1280px de lado) antes de guardarse en IndexedDB (`photosRepo.js`), para no agotar la cuota de almacenamiento del teléfono con fotos de cámara a resolución completa. Se borran en cascada junto con el resto del trabajo.

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
   │  ├─ db.js               # IndexedDB (idb) + pub/sub en memoria + borrado en cascada
   │  ├─ jobsRepo.js
   │  ├─ shelvesRepo.js
   │  ├─ productsRepo.js
   │  ├─ photosRepo.js
   │  ├─ searchHistoryRepo.js
   │  └─ cleanup.js
   ├─ lib/
   │  ├─ parseSheetText.js   # texto → filas con todas las columnas del planogram
   │  ├─ reviewAlerts.js     # chips de alerta no bloqueantes para la Revisión
   │  ├─ report.js           # desglose por shelf + texto plano del reporte
   │  ├─ ocr.js              # Tesseract.js
   │  ├─ barcode.js          # BarcodeDetector + fallback ZXing
   │  ├─ upc.js
   │  ├─ shelfSort.js        # orden de shelves y de productos por posición
   │  ├─ identity.js         # nombre del usuario en localStorage
   │  └─ time.js
   ├─ hooks/useCountdown.js
   ├─ context/ToastContext.jsx, LanguageContext.jsx
   ├─ i18n/translations.js   # es/en
   ├─ components/
   │  ├─ BigButton.jsx, IconButton.jsx, SearchBar.jsx, CountdownChip.jsx
   │  ├─ ShelfGroup.jsx, ProductRow.jsx, ProductMatchCard.jsx, ProductEditModal.jsx
   │  ├─ ProgressSummary.jsx, ReviewTable.jsx, AddOptionsSheet.jsx
   │  ├─ BarcodeScannerView.jsx, JobQrModal.jsx, NamePrompt.jsx, LanguagePicker.jsx
   │  └─ EmptyState.jsx
   └─ pages/
      ├─ HomePage.jsx, NewJobPage.jsx, JobPage.jsx
      ├─ AddManualPage.jsx, PasteTextPage.jsx, PhotoOcrPage.jsx
      ├─ ReviewPage.jsx, ScanPage.jsx
      ├─ ReferencePhotosPage.jsx, ReportPage.jsx
```

## Correr el proyecto

```bash
npm install
npm run dev       # http://localhost:5173 (o IP de la red para probar en el iPhone)
npm run build     # genera dist/ con manifest + service worker
npm run preview   # sirve dist/ para probar el build de producción
npm run icons     # regenera los PNG de public/icons (no requiere ninguna librería de imágenes)
```

No hace falta configurar nada más — no hay claves de API, no hay proyecto en la nube que crear. La app funciona apenas se instalan las dependencias.

### Instalar en el iPhone

1. Servir la app por HTTPS (requisito de Safari para cámara + PWA instalable; en desarrollo, `localhost` cuenta como seguro, pero para probar en el teléfono real se necesita HTTPS o exponerlo vía una herramienta de túnel).
2. Abrir la URL en Safari.
3. Compartir → "Agregar a pantalla de inicio".
4. Abrirla desde el ícono: corre en modo standalone, sin la barra de Safari.

## Limitaciones conocidas / próximos pasos

- Todo es local al dispositivo: un trabajo creado en un celular no es visible desde otro todavía. El código corto de 6 letras y la pantalla de QR ya existen pensados para "Modo equipo" (sync entre dispositivos), pero hoy `joinJob` solo resuelve trabajos que ya existen en el storage de ese mismo teléfono — ver la nota en `src/db/jobsRepo.js`.
- Los íconos del manifest son un placeholder geométrico generado por script (`scripts/generate-icons.mjs`), pensado para reemplazarse por un ícono de marca real.
- El primer uso de OCR en cada instalación necesita conexión a internet para descargar el modelo de idioma de Tesseract (luego queda cacheado por el service worker).
- IndexedDB tiene cuota de almacenamiento por dispositivo/navegador; las fotos de referencia se comprimen antes de guardarse para no agotarla, pero un trabajo con muchísimas fotos de alta resolución podría acercarse al límite en teléfonos con poco espacio libre.

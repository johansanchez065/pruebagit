import{b as e,c as t,d as n,f as r,m as i,o as a}from"./index-BuNOgLW5.js";import{t as o}from"./parseSheetText-BzDNsPRA.js";var s=e(i(),1),c=t(),l=`Shelf 3:
Pañitos húmedos 483823747292
Pañitos secos 2027373022038
Pañales 382721939404

Shelf 4:
Toallas 03834747`;function u(){let{jobId:e}=r(),t=n(),[i,u]=(0,s.useState)(``);return(0,c.jsxs)(`div`,{className:`screen`,children:[(0,c.jsxs)(`div`,{className:`app-header`,children:[(0,c.jsx)(`button`,{className:`back-btn`,onClick:()=>t(-1),"aria-label":`Volver`,children:`‹`}),(0,c.jsx)(`h1`,{children:`Pegar texto`})]}),(0,c.jsx)(`p`,{className:`helper-text`,children:`Pega el texto de la hoja. Usa líneas tipo "Shelf 3:" para marcar el shelf y luego una línea por producto terminando en el UPC.`}),(0,c.jsx)(`textarea`,{className:`mono`,placeholder:l,value:i,onChange:e=>u(e.target.value),autoFocus:!0}),(0,c.jsx)(a,{variant:`primary`,disabled:!i.trim(),onClick:()=>{let n=o(i);t(`/jobs/${e}/review`,{state:{rows:n}})},children:`Procesar texto`})]})}export{u as PasteTextPage};
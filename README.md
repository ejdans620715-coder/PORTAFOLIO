# JAENDA — sitio web

Versión refinada del sitio de JAENDA.

## Archivos

- `index.html` — estructura y contenido de la página.
- `style.css` — diseño visual, responsive y accesibilidad.
- `script.js` — proyectos, ofertas, formularios, navegación y animaciones.
- `proyectos.json` — contenido editable de proyectos, oportunidades y ofertas.
- `logo.svg` — identidad visual.
- `volante.jpg` — imagen utilizada en el proyecto Enlace Cienfuegos del Mayab.

## Publicar en GitHub Pages

1. Sube los archivos al repositorio.
2. En GitHub entra en **Settings → Pages**.
3. Selecciona la rama y la carpeta donde está `index.html`.
4. Guarda y espera a que GitHub Pages publique la nueva versión.

## Actualizar proyectos y ofertas

La forma más sencilla de actualizar el contenido público es editar `proyectos.json`. No hace falta tocar HTML ni CSS para cambiar títulos, descripciones, estados o etiquetas.

## Formularios

El sitio mantiene el flujo actual de correo y la conexión opcional con Google Apps Script para necesidades y ofertas. La URL de Apps Script se encuentra en `script.js`.

## Precios y monedas

Las ofertas nuevas se registran con `precioUSD` (número), `monedaBase: "USD"` y `unidadPrecio` (por ejemplo `unidad`, `kg`, `caja` o `lote`). La página conserva USD como precio maestro y permite al visitante visualizar la conversión a USD, EUR o MXN usando una tasa internacional obtenida en línea. Si la tasa no está disponible, el precio base USD sigue siendo el valor de referencia.

Para compatibilidad con la hoja existente, el formulario también envía el campo `precio` ya formateado. Para conservar `precioUSD` y `unidadPrecio` como columnas independientes en Google Sheets, el Apps Script conectado debe aceptar y guardar esos dos campos.


## Relación JAENDA — Enlace

JAENDA se presenta como plataforma de soporte, exposición y conexión para Enlace Cienfuegos del Mayab y para proyectos de todo tipo. Las cotizaciones, contratos, ventas y demás operaciones comerciales se gestionan formalmente a través de Enlace Cienfuegos del Mayab S.R.L. de C.V.

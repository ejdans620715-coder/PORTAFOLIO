/* ============================================================
   JAENDA — Lógica: proyectos desde proyectos.json
   ============================================================ */

const ETIQUETAS_ESTADO = {
  "completado": "Completado",
  "en-operacion": "En operación",
  "en-desarrollo": "En desarrollo",
  "proximamente": "Próximamente"
};

const ETIQUETAS_OPORTUNIDAD = {
  "en-analisis": "En análisis",
  "buscando-aliados": "Buscando aliados",
  "en-licitacion": "En licitación",
  "adjudicado": "Adjudicado",
  "en-ejecucion": "En ejecución"
};

const ETIQUETAS_OFERTA = {
  "en-transito": "En tránsito",
  "en-bodega": "Disponible",
  "en-demanda": "En demanda",
  "agotado": "Agotado",
  "caducada": "Caducada"
};


const MONEDAS = {
  USD: { simbolo: "$", locale: "en-US" },
  EUR: { simbolo: "€", locale: "es-ES" },
  MXN: { simbolo: "$", locale: "es-MX" }
};

let monedaSeleccionada = localStorage.getItem("jaenda_moneda") || "USD";
let tasasCambio = { USD: 1 };

function precioBaseUSD(oferta) {
  const directo = Number(oferta.precioUSD);
  if (Number.isFinite(directo) && directo >= 0) return directo;
  const legado = String(oferta.precio || "").replace(/[^0-9.,-]/g, "").replace(",", ".");
  const n = Number(legado);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

function unidadPrecio(oferta) {
  return String(oferta.unidadPrecio || oferta.unidad || "unidad").trim() || "unidad";
}

function formatearPrecio(oferta, moneda = monedaSeleccionada) {
  const base = precioBaseUSD(oferta);
  if (base === null) return oferta.precio ? String(oferta.precio) : "Consultar";
  const tasa = Number(tasasCambio[moneda]);
  if (moneda !== "USD" && !Number.isFinite(tasa)) moneda = "USD";
  const tasaAplicada = moneda === "USD" ? 1 : Number(tasasCambio[moneda]);
  const valor = base * tasaAplicada;
  const cfg = MONEDAS[moneda] || MONEDAS.USD;
  const numero = new Intl.NumberFormat(cfg.locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(valor);
  return `${cfg.simbolo}${numero} ${moneda} / ${unidadPrecio(oferta)}`;
}

function renderOfertas() {
  // Recalcula la vitrina completa con la moneda seleccionada.
  // aplicarFiltros() vuelve a construir cada tarjeta y por tanto su precio.
  aplicarFiltros();
}

async function cargarTasasCambio() {
  const estado = document.getElementById("moneda-estado");
  try {
    const r = await fetch("https://open.er-api.com/v6/latest/USD", { cache: "no-store" });
    if (!r.ok) throw new Error("No se pudo obtener la tasa de cambio");
    const datos = await r.json();
    if (!datos.rates) throw new Error("Respuesta de tasas inválida");
    tasasCambio = { ...tasasCambio, ...datos.rates, USD: 1 };
    if (estado) estado.textContent = monedaSeleccionada === "USD" ? "Base: USD" : `Conversión internacional desde USD`;
  } catch (e) {
    if (estado) estado.textContent = "USD disponible · conversión temporalmente no disponible";
    console.warn("JAENDA tasas:", e);
  }
  renderOfertas();
}

function inicializarSelectorMoneda() {
  const selector = document.getElementById("moneda-selector");
  if (!selector) return;
  if (!MONEDAS[monedaSeleccionada]) monedaSeleccionada = "USD";
  selector.value = monedaSeleccionada;
  selector.addEventListener("change", async () => {
    monedaSeleccionada = selector.value;
    localStorage.setItem("jaenda_moneda", monedaSeleccionada);

    const estado = document.getElementById("moneda-estado");
    if (monedaSeleccionada === "USD") {
      if (estado) estado.textContent = "Base: USD";
      renderOfertas();
      return;
    }

    // Si todavía no tenemos la tasa solicitada, la buscamos antes de pintar.
    if (!Number.isFinite(Number(tasasCambio[monedaSeleccionada]))) {
      if (estado) estado.textContent = "Actualizando tasa internacional…";
      await cargarTasasCambio();
    } else {
      if (estado) estado.textContent = "Conversión internacional desde USD";
      renderOfertas();
    }
  });
}

const ICONO_FLECHA = `
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
       stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>
  </svg>`;

function escapar(texto) {
  const div = document.createElement("div");
  div.textContent = texto;
  return div.innerHTML;
}

const DEGRADADOS = [
  "linear-gradient(135deg,#ff9a3d,#ff2e63)",
  "linear-gradient(135deg,#ffd166,#ff6b35)",
  "linear-gradient(135deg,#00f5d4,#00b4d8)",
  "linear-gradient(135deg,#a78bfa,#6d28d9)",
  "linear-gradient(135deg,#ff7eb3,#ff1744)",
  "linear-gradient(135deg,#7cf5b8,#00c853)"
];

function mediaProyecto(proyecto, indice) {
  if (proyecto.imagen) {
    return `<img src="${escapar(proyecto.imagen)}" alt="${escapar(proyecto.titulo)}" loading="lazy">`;
  }

  const iniciales = proyecto.titulo.split(" ").slice(0, 2).map((p) => p[0]).join("").toUpperCase();
  const degradado = DEGRADADOS[indice % DEGRADADOS.length];
  return (
    `<div class="ph" style="background:${degradado};">
       <span style="color:rgba(255,255,255,.9);">${escapar(iniciales)}</span>
     </div>`
  );
}

function enlaceProyecto(proyecto) {
  if (!proyecto.enlace) {
    return `<span class="project-link muted">Próximamente · ${escapar(proyecto.categoria)}</span>`;
  }
  return (
    `<a class="project-link" href="${escapar(proyecto.enlace)}" ${proyecto.enlace.startsWith("http") ? 'target="_blank" rel="noopener"' : ""}>
       Conocer más ${ICONO_FLECHA}
     </a>`
  );
}

function tarjeta(proyecto, indice) {
  const tags = (proyecto.tags || [])
    .map((t) => `<span class="tag">${escapar(t)}</span>`)
    .join("");

  return `
    <article class="project reveal acc-${indice % 4}">
      <div class="project-media">
        <span class="status ${escapar(proyecto.estado)}">${escapar(ETIQUETAS_ESTADO[proyecto.estado] || proyecto.estado)}</span>
        ${mediaProyecto(proyecto, indice)}
      </div>
      <div class="project-body">
        <div class="project-meta">${escapar(proyecto.numero)} · ${escapar(proyecto.categoria)}</div>
        <h3>${escapar(proyecto.titulo)}</h3>
        <p>${escapar(proyecto.descripcion)}</p>
        <div class="tags">${tags}</div>
        <div style="margin-top:18px">${enlaceProyecto(proyecto)}</div>
      </div>
    </article>
  `;
}

async function cargarProyectos() {
  const contenedor = document.getElementById("proyectos-grid");
  const contenedorOportunidades = document.getElementById("oportunidades");
  if (!contenedor && !contenedorOportunidades) return;

  try {
    const respuesta = await fetch("proyectos.json", { cache: "no-cache" });
    if (!respuesta.ok) throw new Error("No se pudo cargar proyectos.json");
    const datos = await respuesta.json();

    if (contenedor) contenedor.innerHTML = (datos.proyectos || []).map(tarjeta).join("");
    if (contenedorOportunidades) contenedorOportunidades.innerHTML = (datos.oportunidades || []).map(tarjetaOportunidad).join("");
  } catch (error) {
    if (contenedor) {
      contenedor.innerHTML =
        `<p class="lead" style="color:#999">
           No se pudieron cargar los proyectos. Verifica que <code>proyectos.json</code> exista junto a la página.
         </p>`;
    }
    console.error("JAENDA:", error);
  } finally {
    observarRevelados();
  }
}

const WHATSAPP_ENLACE = "524422320360";

function tarjetaOportunidad(opp, indice) {
  const buscaAliados = opp.estado === "buscando-aliados";
  const texto = encodeURIComponent(
    `Me interesa sumarme como aliado en: "${opp.titulo}" (sector: ${opp.sector}).`
  );

  return `
    <div class="opp reveal">
      <div class="opp-left">
        <div class="opp-titulo">${escapar(opp.titulo)}</div>
        <div class="opp-sector">${escapar(opp.sector)}</div>
        <p>${escapar(opp.descripcion)}</p>
      </div>
      <div class="opp-right">
        <span class="status estado-${escapar(opp.estado)}">${escapar(ETIQUETAS_OPORTUNIDAD[opp.estado] || opp.estado)}</span>
        ${
          buscaAliados
            ? `<a class="btn gold opp-btn" href="https://wa.me/${WHATSAPP_ENLACE}?text=${texto}" target="_blank" rel="noopener">
                 Sumarme por WhatsApp
               </a>`
            : ""
        }
      </div>
    </div>
  `;
}

function escaparAtributo(texto) {
  return escapar(String(texto)).replace(/"/g, "&quot;");
}

function tarjetaOferta(oferta, indice, pasada) {
  indice = indice || 0;
  const etiqueta = pasada ? "Caducada" : (ETIQUETAS_OFERTA[oferta.estado] || oferta.estado);
  const departamento = (oferta.departamento || "OTROS").trim() || "OTROS";
  const precio = formatearPrecio(oferta);
  const inicial = oferta.titulo.split(" ").slice(0, 2).map((p) => p[0]).join("").toUpperCase();
  const degradado = DEGRADADOS[indice % DEGRADADOS.length];

  return `
    <article class="oferta reveal acc-${indice % 4}${pasada ? " pasada" : ""}">
      <button type="button" class="oferta-media oferta-img" data-titulo="${escaparAtributo(oferta.titulo)}" aria-label="Ver detalle de ${escaparAtributo(oferta.titulo)}">
        <span class="status estado-${pasada ? "caducada" : escapar(oferta.estado)}">${escapar(etiqueta)}</span>
        <span class="oferta-depto">${escapar(departamento)}</span>
        <span class="ph" style="background:${degradado};">
          <img class="oferta-foto" data-busqueda="${escaparAtributo(oferta.titulo)}" alt="" loading="lazy">
          <span class="ph-letras">${escapar(inicial)}</span>
        </span>
        <span class="ver-ficha">Ver ficha ➜</span>
      </button>
      <div class="oferta-body">
        <h3>${escapar(oferta.titulo)}</h3>
        ${pasada ? `<span class="oferta-fin">Oferta caducada</span>` : `<span class="oferta-precio">${escapar(precio)}</span>`}
      </div>
    </article>
  `;
}

/* Foto automática desde Wikipedia Media (gratis y abierta) */
async function obtenerFotoOferta(oferta, img) {
  const clave = (oferta.titulo + " " + (oferta.departamento || "")).trim();
  if (oferta.imagen) {
    imagenesOfertas[clave] = oferta.imagen;
    img.src = oferta.imagen;
    img.classList.add("cargada");
    return;
  }
  if (imagenesOfertas[clave]) {
    img.src = imagenesOfertas[clave];
    img.classList.add("cargada");
    return;
  }
  try {
    const termino = encodeURIComponent(clave);
    const res = await fetch(
      `https://es.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=${termino}&gsrlimit=1&prop=pageimages&piprop=thumbnail&pithumbsize=480&format=json&origin=*`
    );
    const datos = await res.json();
    const paginas = datos.query && datos.query.pages ? Object.values(datos.query.pages) : [];
    const origen = paginas.length && paginas[0].thumbnail ? paginas[0].thumbnail.source : "";
    if (origen) {
      imagenesOfertas[clave] = origen;
      img.src = origen;
      img.classList.add("cargada");
    }
  } catch (error) {
    /* sin foto → se queda el degradado con iniciales */
  }
}

function asignarFotosOfertas() {
  document.querySelectorAll(".vitrina-pista .oferta-foto").forEach((img) => {
    const titulo = img.dataset.busqueda || "";
    const oferta = ofertasActivas.find((o) => o.titulo === titulo);
    if (oferta) obtenerFotoOferta(oferta, img);
  });
}

function separarOfertas(ofertas) {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const activas = [];
  const pasadas = [];
  for (const oferta of ofertas) {
    const fin = oferta.vigenciaHasta ? leerVigencia(oferta.vigenciaHasta) : null;
    if (fin && !isNaN(fin) && fin < hoy) pasadas.push(oferta); else activas.push(oferta);
  }
  return { activas, pasadas };
}

/* Interpreta la fecha "Sat Oct 31 2026 00:00:00 GMT-0600..." que manda Google Sheets
   SIN concatenarle "T00:00:00" (eso la vuelve inválida y desaparecían las ofertas). */
function leerVigencia(valor) {
  const t = String(valor || "").trim();
  if (!t) return null;
  const solo = /^\d{4}-\d{2}-\d{2}$/.test(t);
  if (solo) return new Date(t + "T00:00:00");
  const d = new Date(t);
  return isNaN(d) ? null : d;
}

function inicializarInteresOfertas() {
  document.addEventListener("click", (evento) => {
    const enlace = evento.target.closest(".oferta-interes");
    if (!enlace) return;
    const producto = enlace.dataset.producto || "";
    const descripcion = document.getElementById("n-descripcion");
    if (descripcion && producto) {
      descripcion.value = `Me interesa: ${producto}`;
    }
  });
}

/* -------- Animaciones al hacer scroll -------- */

function observarRevelados() {
  const candidatos = document.querySelectorAll(".reveal");
  if (!("IntersectionObserver" in window)) {
    candidatos.forEach((el) => el.classList.add("in"));
    return;
  }
  const obs = new IntersectionObserver(
    (entradas) => {
      entradas.forEach((entrada) => {
        if (entrada.isIntersecting) {
          entrada.target.classList.add("in");
          obs.unobserve(entrada.target);
        }
      });
    },
    { threshold: 0.12 }
  );
  candidatos.forEach((el) => obs.observe(el));
}

/* -------- Menú móvil -------- */

function inicializarMenu() {
  const burger = document.getElementById("burger");
  const menu = document.getElementById("menu");
  if (!burger || !menu) return;

  burger.addEventListener("click", () => {
    const abierto = !menu.classList.contains("open");
    burger.classList.toggle("open", abierto);
    menu.classList.toggle("open", abierto);
    burger.setAttribute("aria-expanded", String(abierto));
  });

  menu.querySelectorAll("a").forEach((enlace) => {
    enlace.addEventListener("click", () => {
      burger.classList.remove("open");
      menu.classList.remove("open");
      burger.setAttribute("aria-expanded", "false");
    });
  });
}

/* -------- Formulario de contacto (compone el mailto) -------- */

function inicializarContacto() {
  const formulario = document.getElementById("contact-form");
  if (!formulario) return;

  formulario.addEventListener("submit", (evento) => {
    evento.preventDefault();
    const datos = new FormData(formulario);
    const asunto = encodeURIComponent(datos.get("asunto") || "Contacto desde el sitio JAENDA");
    const cuerpo = encodeURIComponent(
      `Mensaje:\n${datos.get("mensaje")}\n\nEnvía desde: ${datos.get("email")}`
    );
    window.location.href = `mailto:${formulario.dataset.email}?subject=${asunto}&body=${cuerpo}`;
  });
}

/* -------- Polvo dorado en la portada -------- */

function animacionHero() {
  const lienzo = document.getElementById("hero-canvas");
  const titulo = document.getElementById("hero-title");
  const hero = lienzo && lienzo.parentElement;
  if (!lienzo || !hero) return;

  const contexto = lienzo.getContext("2d");
  const reducido = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const esMovil = window.matchMedia("(max-width: 820px)").matches;

  let ancho = 0;
  let alto = 0;
  let particulas = [];
  let marco = null;
  let visible = !document.hidden;

  const COLORES = ["217,164,65", "255,109,90", "57,213,184", "176,123,255"];

  function ajustarDimensiones() {
    const rect = hero.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    ancho = rect.width;
    alto = rect.height;
    lienzo.width = Math.round(ancho * dpr);
    lienzo.height = Math.round(alto * dpr);
    contexto.setTransform(dpr, 0, 0, dpr, 0, 0);
    contexto.clearRect(0, 0, ancho, alto);
    sembrar();
  }

  function sembrar() {
    const total = esMovil
      ? Math.max(22, Math.round(ancho / 40))
      : Math.max(38, Math.round(ancho / 16));
    particulas = Array.from({ length: total }, () => {
      const numColor = COLORES[Math.floor(Math.random() * COLORES.length)];
      return {
        x: Math.random() * ancho,
        y: Math.random() * alto,
        r: 0.6 + Math.random() * 1.9,
        vy: 0.12 + Math.random() * 0.5,
        fase: Math.random() * Math.PI * 2,
        velOnda: 0.002 + Math.random() * 0.006,
        amplitud: 6 + Math.random() * 16,
        color: `rgb(${numColor},${(0.12 + Math.random() * 0.55).toFixed(2)})`,
        parpadeo: 0.02 + Math.random() * 0.05,
        opacidad: Math.random() * Math.PI * 2
      };
    });
  }

  function dibujar(ahora) {
    contexto.clearRect(0, 0, ancho, alto);

    for (const p of particulas) {
      p.y -= p.vy;
      p.fase += p.velOnda;
      p.x = p.x + Math.sin(p.fase) * 0.4;
      p.opacidad += p.parpadeo;

      if (p.y < -6) {
        p.y = alto + 6;
        p.x = Math.random() * ancho;
      }
      if (p.x < -8) p.x = ancho + 8;
      if (p.x > ancho + 8) p.x = -8;

      const alfa = 0.18 + 0.5 * (0.5 + 0.5 * Math.sin(p.opacidad));
      contexto.globalAlpha = Math.max(0.08, alfa);
      contexto.fillStyle = p.color;
      contexto.beginPath();
      contexto.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      contexto.fill();
    }

    contexto.globalAlpha = 1;
  }

  function bucle(ahora) {
    if (visible) dibujar(ahora);
    marco = requestAnimationFrame(bucle);
  }

  function pausar() { visible = false; }
  function reanudar() { visible = true; }

  /* Parallax sutil con el mouse (solo escritorio) */
  function parallax(evento) {
    if (reducido || esMovil) return;
    const cx = evento.clientX / window.innerWidth - 0.5;
    const cy = evento.clientY / window.innerHeight - 0.5;
    if (hero) hero.style.transform = `translate(${(cx * -14).toFixed(1)}px, ${(cy * -10).toFixed(1)}px)`;
    if (titulo) titulo.style.transform = `translate(${(cx * 22).toFixed(1)}px, ${(cy * 16).toFixed(1)}px)`;
  }

  /* ---- Eventos ---- */
  ajustarDimensiones();
  if (!reducido) {
    window.addEventListener("resize", ajustarDimensiones);
    window.addEventListener("mousemove", parallax, { passive: true });
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) pausar(); else reanudar();
    });
    bucle(0);
  }
}

/* -------- Formulario de aliados (compone el mailto) -------- */

function inicializarAliados() {
  const formulario = document.getElementById("aliados-form");
  if (!formulario) return;

  formulario.addEventListener("submit", (evento) => {
    evento.preventDefault();
    const datos = new FormData(formulario);
    const asunto = encodeURIComponent(
      `Red de aliados JAENDA — ${datos.get("empresa")} (${datos.get("sector")})`
    );
    const cuerpo = encodeURIComponent(
      `Empresa: ${datos.get("empresa")}\n` +
      `Sector: ${datos.get("sector")}\n` +
      `Capacidades: ${datos.get("capacidades")}\n` +
      `Contacto: ${datos.get("contacto")}`
    );
    window.location.href = `mailto:${formulario.dataset.email}?subject=${asunto}&body=${cuerpo}`;
  });
}

/* -------- Formulario de necesidades: Google Sheets + respaldo por correo -------- */

const GOOGLE_APP_URL = "https://script.google.com/macros/s/AKfycbyiIRusCfL96OS1oDWohc1KjWX_Phy_URv3RkUr08hJKv8yAoAxnPBwnqm7aiEbrAk6Yw/exec";
// Pega aquí la URL de tu Aplicación Web de Google Apps Script
// (ver google_apps_script/code.gs). Con ella, los registros se archivan
// solos en tu hoja y se devuelve un código. Si queda vacía, se usa mailto.

function inicializarNecesidades() {
  const formulario = document.getElementById("necesidades-form");
  if (!formulario) return;

  const codigoInput = document.getElementById("n-codigo");
  const modoWrap = document.getElementById("n-modo-wrap");
  const resultado = document.getElementById("n-resultado");

  if (codigoInput && modoWrap) {
    const alternarModo = () => {
      modoWrap.style.display = codigoInput.value.trim().length >= 4 ? "block" : "none";
    };
    codigoInput.addEventListener("input", alternarModo);
  }

  formulario.addEventListener("submit", async (evento) => {
    evento.preventDefault();
    const datos = new FormData(formulario);
    const payload = {
      quien: datos.get("quien"),
      sector: datos.get("sector"),
      descripcion: datos.get("descripcion"),
      cantidad: datos.get("cantidad"),
      contacto: datos.get("contacto"),
      codigoAnterior: datos.get("codigoAnterior") || "",
      modo: datos.get("modo") === "nueva" ? "nueva" : "repetir"
    };

    if (resultado) {
      resultado.className = "needs-result";
      resultado.innerHTML = "";
    }

    if (!String(payload.contacto || "").trim()) {
      mostrarError("Escribe tu correo o teléfono para darte seguimiento.", resultado);
      const campoContacto = document.getElementById("n-contacto");
      if (campoContacto) campoContacto.focus();
      return;
    }

    if (GOOGLE_APP_URL) {
      try {
        const r = await enviarJsonp(payload);
        if (r.ok) {
          mostrarExito(payload, resultado, r.codigo, r.actualizado);
          formulario.reset();
          if (modoWrap) modoWrap.style.display = "none";
        } else {
          mostrarError(r.error || "Registro rechazado por el archivo.", resultado);
        }
      } catch (error) {
        mostrarError("No se pudo conectar con el archivo. Intenta de nuevo.", resultado);
        console.error("JAENDA:", error);
      }
    } else {
      // Respaldo: abrir correo con el mensaje estructurado
      const asunto = encodeURIComponent(
        `Necesidad ${payload.codigoAnterior ? "repetida" : "registrada"} — ${payload.quien} (${payload.sector})`
      );
      const cuerpo = encodeURIComponent(
        `Quién: ${payload.quien}\n` +
        `Rubro: ${payload.sector}\n` +
        `Código anterior: ${payload.codigoAnterior || "ninguno"}\n` +
        `Modo: ${payload.modo}\n` +
        `Necesidad: ${payload.descripcion}\n` +
        `Volumen/frecuencia: ${payload.cantidad || "no indicado"}\n` +
        `Contacto: ${payload.contacto}\n\n` +
        `PENDIENTE DE ANÁLISIS — registrar en el archivo de necesidades.`
      );
      window.location.href = `mailto:${formulario.dataset.email}?subject=${asunto}&body=${cuerpo}`;
      mostrarExito(payload, resultado);
    }
  });
}

function mostrarExito(payload, contenedor, codigo, actualizado) {
  if (!contenedor) return;
  const titulo = actualizado ? "Necesidad actualizada, gracias." : "Recibido, gracias.";
  const instruccion = actualizado
    ? "Se sumó tu nuevo pedido a esta necesidad."
    : "Guarda este código para repetir o cambiar tu necesidad:";
  contenedor.className = "needs-result ok";
  contenedor.innerHTML =
    `<strong>${titulo}</strong> ${instruccion}` +
    `<div class="codigo-grande">${codigo || "NEC-????"}</div>` +
    `Tu registro (${payload.sector} · ${payload.quien}) quedó archivado para análisis.`;
  contenedor.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function mostrarError(mensaje, contenedor) {
  if (!contenedor) return;
  contenedor.className = "needs-result err";
  contenedor.textContent = mensaje;
  contenedor.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

/* JSONP hacia Google Apps Script (funciona sin CORS en webs estáticas) */
function enviarJsonp(payload, extra) {
  return new Promise((resolver, rechazar) => {
    const nombreFun = "jaenda_cb_" + Date.now();
    const script = document.createElement("script");
    const temporizador = setTimeout(() => {
      limpiar();
      rechazar(new Error("Sin respuesta de Google Apps Script"));
    }, 6000);
    const limpiar = () => {
      clearTimeout(temporizador);
      delete window[nombreFun];
      if (script.parentNode) script.parentNode.removeChild(script);
    };
    const partes = ["cb=" + nombreFun];
    if (payload) partes.push("q=" + encodeURIComponent(JSON.stringify(payload)));
    if (extra) {
      for (const clave of Object.keys(extra)) {
        partes.push(encodeURIComponent(clave) + "=" + encodeURIComponent(extra[clave]));
      }
    }
    script.src = GOOGLE_APP_URL + "?" + partes.join("&");
    window[nombreFun] = (respuesta) => {
      limpiar();
      resolver(respuesta);
    };
    script.onerror = () => {
      limpiar();
      rechazar(new Error("No se pudo conectar con Google Apps Script"));
    };
    document.head.appendChild(script);
  });
}

/* POST JSON hacia Google Apps Script (guardar ofertas desde el panel) */
async function enviarPost(payload) {
  const respuesta = await fetch(GOOGLE_APP_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify(payload)
  });
  return respuesta.json();
}

/* Lee las ofertas desde la hoja; si no hay conexión, usa el archivo local */
let ofertasActivas = [];
let ofertasPasadas = [];
let vitrinaLista = [];
let vitrinaPagina = 0;
const OFERTAS_POR_PAGINA = 4;
const DEPARTAMENTOS_OFERTA = [
  "ALIMENTOS",
  "FERRETERÍA",
  "MATERIAS PRIMAS",
  "ELECTRÓNICA",
  "EQUIPOS ELÉCTRICOS",
  "TRANSPORTE",
  "SALUD Y HIGIENE",
  "ENVASES Y EMBALAJES",
  "TEXTIL Y VESTUARIO",
  "AGRICULTURA E INSUMOS",
  "OTROS"
];
const imagenesOfertas = {};

function normalizarBusqueda(t) {
  return String(t || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function ofertaCoincide(oferta, q) {
  if (!q) return true;
  const contenido = [oferta.titulo, oferta.descripcion, oferta.origen, oferta.destino, oferta.cantidad, oferta.precio]
    .concat(oferta.tags || [])
    .join(" ");
  return normalizarBusqueda(contenido).indexOf(q) >= 0;
}

function construirCategorias() {
  const contenedor = document.getElementById("oferta-categorias");
  if (!contenedor) return;
  const cuentas = {};
  ofertasActivas.forEach((o) => {
    const d = (o.departamento || "OTROS").trim() || "OTROS";
    cuentas[d] = (cuentas[d] || 0) + 1;
  });
  const chips = [["todos", "Todos los suministros"]];
  DEPARTAMENTOS_OFERTA.forEach((d) => chips.push([d, d]));
  contenedor.innerHTML = "";
  let primero = true;
  chips.forEach(([valor, texto]) => {
    const n = valor === "todos" ? ofertasActivas.length : (cuentas[valor] || 0);
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "chip" + (primero ? " activo" : "") + (n ? "" : " vacio");
    chip.dataset.departamento = valor;
    chip.innerHTML = `${texto}${n ? ` <span class="chip-n">${n}</span>` : ""}`;
    chip.addEventListener("click", () => {
      if (chip.classList.contains("vacio")) return;
      contenedor.querySelectorAll(".chip").forEach((c) => c.classList.remove("activo"));
      chip.classList.add("activo");
      aplicarFiltros();
    });
    contenedor.appendChild(chip);
    primero = false;
  });
}

function renderizarVitrinaPagina() {
  const pista = document.getElementById("vitrina-pista");
  const pagina = document.getElementById("vitrina-pagina");
  const prev = document.getElementById("vitrina-prev");
  const next = document.getElementById("vitrina-next");
  const conteo = document.getElementById("oferta-conteo");
  if (!pista) return;

  const total = vitrinaLista.length;
  const totalPaginas = Math.max(1, Math.ceil(total / OFERTAS_POR_PAGINA));
  if (vitrinaPagina >= totalPaginas) vitrinaPagina = totalPaginas - 1;
  if (vitrinaPagina < 0) vitrinaPagina = 0;

  const desde = vitrinaPagina * OFERTAS_POR_PAGINA;
  const trozo = vitrinaLista.slice(desde, desde + OFERTAS_POR_PAGINA);

  pista.innerHTML = trozo.length
    ? trozo.map((o, i) => tarjetaOferta(o, i)).join("")
    : `<p class="lead" style="text-align:center;color:var(--text-dim);padding:30px 0">Sin resultados para ese filtro o búsqueda.</p>`;

  if (pagina) {
    pagina.textContent = total ? `Página ${vitrinaPagina + 1} de ${totalPaginas}` : "";
  }
  if (conteo) {
    conteo.textContent = total ? `${desde + 1}–${desde + trozo.length} de ${total} ofertas` : "0 ofertas";
  }
  if (prev) prev.classList.toggle("inactivo", vitrinaPagina === 0);
  if (next) next.classList.toggle("inactivo", vitrinaPagina >= totalPaginas - 1);

  observarRevelados();
  asignarFotosOfertas();
}

function irAPagina(direccion) {
  const totalPaginas = Math.max(1, Math.ceil(vitrinaLista.length / OFERTAS_POR_PAGINA));
  vitrinaPagina = Math.min(Math.max(0, vitrinaPagina + direccion), totalPaginas - 1);
  renderizarVitrinaPagina();
}

function aplicarFiltros() {
  const historial = document.getElementById("ofertas-historial");
  const listado = document.getElementById("ofertas-historial-list");
  const resumen = document.getElementById("ofertas-historial-resumen");
  if (!document.getElementById("vitrina-pista")) return;

  const chipAct = document.querySelector("#oferta-categorias .chip.activo");
  const departamento = chipAct && chipAct.dataset.departamento !== "todos" ? chipAct.dataset.departamento : "";
  const campo = document.getElementById("oferta-busqueda");
  const q = normalizarBusqueda(campo ? campo.value : "");

  vitrinaLista = ofertasActivas.filter((o) => {
    if (departamento && (o.departamento || "OTROS").trim() !== departamento) return false;
    if (q && !ofertaCoincide(o, q)) return false;
    return true;
  });
  vitrinaPagina = 0;
  renderizarVitrinaPagina();

  if (historial) {
    listado.innerHTML = ofertasPasadas.map((o, i) => tarjetaOferta(o, i, true)).join("");
    if (resumen) resumen.textContent = `Historial de ofertas · ${ofertasPasadas.length}`;
    historial.style.display = ofertasPasadas.length ? "block" : "none";
  }
}

function asignarNavegacionVitrina() {
  const prev = document.getElementById("vitrina-prev");
  const next = document.getElementById("vitrina-next");
  if (!prev || !next) return;
  prev.onclick = () => irAPagina(-1);
  next.onclick = () => irAPagina(1);
}

async function cargarOfertas() {
  const pista = document.getElementById("vitrina-pista");
  if (!pista) return;

  let ofertas = null;
  if (GOOGLE_APP_URL) {
    try {
      const r = await enviarJsonp(null, { accion: "lista_ofertas" });
      if (r && r.ok && Array.isArray(r.ofertas)) ofertas = r.ofertas;
    } catch (error) {
      /* sin conexión → respaldo local */
    }
  }
  if (!ofertas || ofertas.length === 0) {
    try {
      const respuesta = await fetch("proyectos.json", { cache: "no-cache" });
      const datos = await respuesta.json();
      ofertas = datos.ofertas || [];
    } catch (error) {
      ofertas = [];
    }
  }

  const { activas, pasadas } = separarOfertas(ofertas);
  ofertasActivas = activas;
  ofertasPasadas = pasadas;
  construirCategorias();
  asignarNavegacionVitrina();
  aplicarFiltros();
}

function inicializarBusquedaOfertas() {
  const campo = document.getElementById("oferta-busqueda");
  if (!campo) return;
  campo.addEventListener("input", aplicarFiltros);
}

/* -------- Detalle de oferta (clic en la imagen) -------- */

function inicializarDetalleOfertas() {
  const panel = document.getElementById("oferta-detalle");
  const contenido = document.getElementById("oferta-detalle-contenido");
  const acciones = document.getElementById("oferta-detalle-acciones");
  const botonCerrar = document.getElementById("oferta-detalle-cerrar");
  if (!panel || !contenido || !acciones) return;

  const cerrar = () => {
    panel.classList.remove("abierto");
    document.body.style.overflow = "";
  };

  document.addEventListener("click", (evento) => {
    const boton = evento.target.closest(".oferta-img");
    if (!boton) return;
    const oferta = ofertasActivas.find((o) => o.titulo === boton.dataset.titulo);
    if (!oferta) return;

    const clave = (oferta.titulo + " " + (oferta.departamento || "")).trim();
    const foto = oferta.imagen || imagenesOfertas[clave] || "";
    const iniciales = oferta.titulo.split(" ").slice(0, 2).map((p) => p[0]).join("").toUpperCase();
    const mercado = oferta.mercado || "Cuba";
    const mensaje = encodeURIComponent(
      `Me interesa este suministro: ${oferta.titulo} (${oferta.origen} → ${oferta.destino}, ${oferta.cantidad}). ¿Cómo seguimos?`
    );
    const fecha = (t, prefijo) =>
      t ? `<div class="param"><span class="pk">${prefijo}</span><span>${escapar(t)}</span></div>` : "";

    contenido.innerHTML = `
      <div class="detalle-top">
        <div class="detalle-foto">
          ${foto
            ? `<img src="${foto}" alt="${escaparAtributo(oferta.titulo)}">`
            : `<span class="detalle-ph" style="background:${DEGRADADOS[ofertasActivas.indexOf(oferta) % DEGRADADOS.length]};">${escapar(iniciales)}</span>`}
        </div>
        <div class="detalle-head">
          <span class="oferta-depto detalle-depto">${escapar((oferta.departamento || "OTROS").trim() || "OTROS")}</span>
          <h3>${escapar(oferta.titulo)}</h3>
          <p>${escapar(oferta.descripcion)}</p>
        </div>
      </div>
      <div class="params">
        <div class="param"><span class="pk">Estado</span><span>${escapar(ETIQUETAS_OFERTA[oferta.estado] || oferta.estado)}</span></div>
        <div class="param"><span class="pk">Embarque</span><span>${escapar(oferta.origen)} → ${escapar(oferta.destino)}</span></div>
        <div class="param"><span class="pk">Lote</span><span>${escapar(oferta.cantidad)}</span></div>
        <div class="param"><span class="pk">Llegada</span><span>${escapar(oferta.eta)}</span></div>
        ${fecha(oferta.vigenciaHasta, "Vigencia")}
        <div class="param"><span class="pk">Precio</span><span>${escapar(formatearPrecio(oferta))}</span></div>
        ${precioBaseUSD(oferta) !== null && monedaSeleccionada !== "USD" ? `<div class="param"><span class="pk">Precio base</span><span>${escapar(formatearPrecio(oferta, "USD"))}</span></div>` : ""}
        <div class="param"><span class="pk">Mercado</span><span>${escapar(mercado)}</span></div>
      </div>
      <div class="tags">
        ${(oferta.tags || []).map((t) => `<span class="tag">${escapar(t)}</span>`).join("")}
      </div>
    `;
    acciones.innerHTML = `
        <div class="oferta-gestion-enlace">Comercialización gestionada a través de <strong>Enlace Cienfuegos del Mayab S.R.L. de C.V.</strong></div>
        <a class="btn gold oferta-whats" href="https://wa.me/${WHATSAPP_ENLACE}?text=${mensaje}" target="_blank" rel="noopener">SOLICITAR COTIZACIÓN</a>
        <a class="btn ghost oferta-interes" href="#necesidades" data-producto="${escaparAtributo(oferta.titulo)}">REGISTRAR MI INTERÉS</a>
    `;
    panel.classList.add("abierto");
    document.body.style.overflow = "hidden";
    contenido.scrollTop = 0;
  });

  botonCerrar.addEventListener("click", cerrar);
  panel.addEventListener("click", (evento) => {
    if (evento.target === panel) cerrar();
  });
  document.addEventListener("keydown", (evento) => {
    if (evento.key === "Escape" && panel.classList.contains("abierto")) cerrar();
  });
}

/* -------- Panel de gestión de ofertas -------- */

function mostrarGestionMensaje(contenedor, error, mensaje) {
  if (!contenedor) return;
  contenedor.className = "needs-result " + (error ? "err" : "ok");
  contenedor.textContent = mensaje;
  contenedor.style.display = "block";
}


let ofertaGestionActual = null;

function idOferta(oferta) {
  return String(oferta.id || oferta.ID || oferta.codigo || oferta.titulo || "").trim();
}

function cargarOfertaEnGestion(oferta, duplicar = false) {
  const panel = document.getElementById("gestion-panel");
  const form = document.getElementById("gestion-form");
  if (!panel || !form || !oferta) return;
  ofertaGestionActual = duplicar ? null : oferta;
  document.getElementById("g-modo").value = duplicar ? "crear" : "editar";
  document.getElementById("g-id").value = duplicar ? "" : idOferta(oferta);
  document.getElementById("g-titulo-original").value = duplicar ? "" : (oferta.titulo || "");
  document.getElementById("gestion-titulo").textContent = duplicar ? "Duplicar oferta" : "Editar oferta";
  document.getElementById("gestion-guardar").textContent = duplicar ? "GUARDAR COMO NUEVA" : "GUARDAR CAMBIOS";
  document.getElementById("gestion-cancelar-edicion").style.display = "inline-flex";

  const set = (id, valor) => { const e=document.getElementById(id); if(e) e.value = valor ?? ""; };
  set("g-titulo", duplicar ? `${oferta.titulo || ""} — copia` : oferta.titulo);
  set("g-descripcion", oferta.descripcion);
  set("g-cantidad", oferta.cantidad);
  set("g-precio", precioBaseUSD(oferta) ?? "");
  set("g-unidad", unidadPrecio(oferta));
  set("g-origen", oferta.origen);
  set("g-destino", oferta.destino);
  set("g-eta", oferta.eta);
  set("g-vigencia", /^\d{4}-\d{2}-\d{2}$/.test(String(oferta.vigenciaHasta||"")) ? oferta.vigenciaHasta : "");
  set("g-departamento", oferta.departamento || "OTROS");
  set("g-estado", oferta.estado || "en-transito");
  set("g-tags", Array.isArray(oferta.tags) ? oferta.tags.join(", ") : (oferta.tags || ""));
  set("g-imagen", oferta.imagen);
  panel.classList.add("abierto");
  const lista = document.getElementById("gestion-lista");
  if (lista) lista.style.display = "none";
  form.style.display = "grid";
  document.body.style.overflow = "hidden";
}

function resetearGestion() {
  const form=document.getElementById("gestion-form");
  if (!form) return;
  const clave=document.getElementById("g-clave")?.value || "";
  form.reset();
  document.getElementById("g-clave").value=clave;
  document.getElementById("g-modo").value="crear";
  document.getElementById("g-id").value="";
  document.getElementById("g-titulo-original").value="";
  document.getElementById("gestion-titulo").textContent="Administrar fichas";
  document.getElementById("gestion-guardar").textContent="GUARDAR OFERTA";
  document.getElementById("gestion-cancelar-edicion").style.display="none";
  ofertaGestionActual=null;
}


function renderizarListaGestion() {
  const lista = document.getElementById("gestion-lista");
  const form = document.getElementById("gestion-form");
  if (!lista) return;
  const todas = [...ofertasActivas, ...ofertasPasadas];
  lista.innerHTML = todas.length ? todas.map(o => `
    <div class="gestion-item">
      <div class="gestion-item-info">
        <strong>${escapar(o.titulo || "Sin título")}</strong>
        <span>${escapar((o.departamento || "OTROS"))} · ${escapar(formatearPrecio(o, "USD"))}</span>
      </div>
      <div class="gestion-item-actions">
        <button type="button" class="btn admin-mini" data-admin-editar data-titulo="${escaparAtributo(o.titulo)}">✏️ EDITAR</button>
        <button type="button" class="btn admin-mini" data-admin-duplicar data-titulo="${escaparAtributo(o.titulo)}">⧉ DUPLICAR</button>
        <button type="button" class="btn admin-mini admin-delete" data-admin-eliminar data-titulo="${escaparAtributo(o.titulo)}">🗑 ELIMINAR</button>
      </div>
    </div>`).join("") : `<div class="gestion-vacio">No hay fichas registradas.</div>`;
  lista.style.display = "grid";
  if (form) form.style.display = "none";
  document.getElementById("gestion-titulo").textContent = "MIS FICHAS";
}

function inicializarGestion() {
  const botonAbrir = document.getElementById("btn-gestion");
  const panel = document.getElementById("gestion-panel");
  const botonCerrar = document.getElementById("gestion-cerrar");
  const formulario = document.getElementById("gestion-form");
  const espera = document.getElementById("gestion-espera");
  if (!botonAbrir || !panel || !formulario) return;

  const abrir = () => {
    resetearGestion();
    panel.classList.add("abierto");
    renderizarListaGestion();
    document.body.style.overflow = "hidden";
    const primerCampo = formulario.querySelector("input, select");
    if (primerCampo) primerCampo.focus();
  };
  const cerrar = () => {
    panel.classList.remove("abierto");
    document.body.style.overflow = "";
    if (espera) espera.style.display = "none";
  };

  document.getElementById("gestion-nueva")?.addEventListener("click", () => {
    resetearGestion();
    document.getElementById("gestion-lista").style.display = "none";
    formulario.style.display = "grid";
    document.getElementById("gestion-titulo").textContent = "NUEVA FICHA";
  });
  document.getElementById("gestion-ver-fichas")?.addEventListener("click", () => {
    resetearGestion();
    renderizarListaGestion();
  });

  botonAbrir.addEventListener("click", abrir);
  botonCerrar.addEventListener("click", cerrar);
  panel.addEventListener("click", (evento) => {
    if (evento.target === panel) cerrar();
  });

  formulario.addEventListener("submit", async (evento) => {
    evento.preventDefault();
    if (espera) { espera.className = "needs-result err"; espera.style.display = "none"; }

    const d = new FormData(formulario);
    const payload = {
      accion: document.getElementById("g-modo").value === "editar" ? "editarOferta" : "registrarOferta",
      clave: d.get("clave"),
      id: d.get("id") || "",
      tituloOriginal: d.get("tituloOriginal") || "",
      titulo: d.get("titulo"),
      descripcion: d.get("descripcion"),
      cantidad: d.get("cantidad"),
      origen: d.get("origen"),
      destino: d.get("destino"),
      eta: d.get("eta"),
      vigenciaHasta: d.get("vigenciaHasta"),
      estado: d.get("estado"),
      precioUSD: Number(d.get("precioUSD")),
      monedaBase: "USD",
      unidadPrecio: d.get("unidadPrecio"),
      precio: `$${Number(d.get("precioUSD")).toFixed(2)} USD / ${d.get("unidadPrecio")}`,
      tags: d.get("tags"),
      departamento: d.get("departamento"),
      imagen: d.get("imagen") || ""
    };

    if (!GOOGLE_APP_URL) {
      mostrarGestionMensaje(espera, true, "Sin conexión: primero conecta la hoja (ver README).");
      return;
    }

    try {
      const respuesta = await enviarPost(payload);
      if (respuesta.ok) {
        mostrarGestionMensaje(espera, false, (respuesta.mensaje || "Oferta guardada.") + " Se actualizó la página.");
        resetearGestion();
        cerrar();
        await cargarOfertas();
      } else {
        mostrarGestionMensaje(espera, true, respuesta.error || "No se pudo guardar la oferta.");
      }
    } catch (error) {
      mostrarGestionMensaje(espera, true, "No se pudo conectar. Verifica que hayas publicado la versión nueva del script.");
      console.error("JAENDA:", error);
    }
  });


  const cancelarEdicion = document.getElementById("gestion-cancelar-edicion");
  cancelarEdicion?.addEventListener("click", resetearGestion);

  document.addEventListener("click", async (evento) => {
    const editar = evento.target.closest("[data-admin-editar]");
    const duplicar = evento.target.closest("[data-admin-duplicar]");
    const eliminar = evento.target.closest("[data-admin-eliminar]");
    if (editar || duplicar) {
      const titulo = (editar || duplicar).dataset.titulo;
      const oferta = [...ofertasActivas, ...ofertasPasadas].find(o => o.titulo === titulo);
      if (oferta) { document.getElementById("oferta-detalle-cerrar")?.click(); cargarOfertaEnGestion(oferta, !!duplicar); }
      return;
    }
    if (eliminar) {
      const titulo = eliminar.dataset.titulo;
      const oferta = [...ofertasActivas, ...ofertasPasadas].find(o => o.titulo === titulo);
      if (!oferta) return;
      const clave = prompt(`Para eliminar "${titulo}", escribe la clave de gestión:`);
      if (!clave) return;
      if (!confirm(`¿Seguro que deseas eliminar "${titulo}"? Esta acción no se puede deshacer.`)) return;
      try {
        const r = await enviarPost({ accion:"eliminarOferta", clave, id:idOferta(oferta), tituloOriginal:oferta.titulo });
        if (!r.ok) throw new Error(r.error || "El script todavía no admite eliminarOferta.");
        document.getElementById("oferta-detalle-cerrar")?.click();
        await cargarOfertas();
        alert("Oferta eliminada.");
      } catch (e) {
        alert("No se pudo eliminar. Hay que actualizar Google Apps Script para admitir editarOferta/eliminarOferta. " + e.message);
      }
    }
  });

  const botonRecargar = document.getElementById("gestion-recargar");
  if (botonRecargar) {
    botonRecargar.addEventListener("click", async () => {
      await cargarOfertas();
      if (espera) {
        espera.className = "needs-result ok";
        espera.textContent = "Ofertas actualizadas desde la hoja.";
        espera.style.display = "block";
      }
    });
  }
}

/* -------- Navegación activa, progreso y volver arriba -------- */

function inicializarExperienciaPagina() {
  const barra = document.getElementById("scroll-progress");
  const botonArriba = document.getElementById("back-top");
  const enlaces = [...document.querySelectorAll(".menu a[href^='#']")];
  const secciones = enlaces
    .map((a) => document.querySelector(a.getAttribute("href")))
    .filter(Boolean);
  let raf = null;

  const actualizar = () => {
    raf = null;
    const scrollMax = document.documentElement.scrollHeight - window.innerHeight;
    const progreso = scrollMax > 0 ? (window.scrollY / scrollMax) * 100 : 0;
    if (barra) barra.style.width = progreso + "%";
    if (botonArriba) botonArriba.classList.toggle("visible", window.scrollY > 650);
  };

  const pedirActualizacion = () => {
    if (raf === null) raf = requestAnimationFrame(actualizar);
  };

  window.addEventListener("scroll", pedirActualizacion, { passive: true });
  window.addEventListener("resize", pedirActualizacion, { passive: true });
  actualizar();

  if (botonArriba) {
    botonArriba.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
  }

  if ("IntersectionObserver" in window && secciones.length) {
    const mapa = new Map(secciones.map((s) => [s.id, enlaces.find((a) => a.getAttribute("href") === "#" + s.id)]));
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        enlaces.forEach((a) => a.classList.remove("active"));
        const enlace = mapa.get(entry.target.id);
        if (enlace) enlace.classList.add("active");
      });
    }, { rootMargin: "-25% 0px -60% 0px", threshold: 0 });
    secciones.forEach((s) => observer.observe(s));
  }

  document.addEventListener("keydown", (evento) => {
    if (evento.key !== "Escape") return;
    const detalle = document.getElementById("oferta-detalle");
    const gestion = document.getElementById("gestion-panel");
    if (detalle?.classList.contains("abierto")) document.getElementById("oferta-detalle-cerrar")?.click();
    if (gestion?.classList.contains("abierto")) document.getElementById("gestion-cerrar")?.click();
  });
}

/* -------- Año en el pie -------- */

/* Fondo del inicio: usa fotos libres conocidas, con respaldo si caen */
const FOTOS_HERO = [
  "portada-jaenda.png"
];

function cargarFotoHero() {
  const destino = document.getElementById("hero-foto");
  if (!destino) return;
  const probar = (indice) => {
    if (indice >= FOTOS_HERO.length) return;
    const img = new Image();
    img.onload = () => {
      destino.style.setProperty("--hero-foto-url", `url("${FOTOS_HERO[indice]}")`);
      destino.classList.add("lista");
    };
    img.onerror = () => probar(indice + 1);
    img.src = FOTOS_HERO[indice];
  };
  probar(0);
}

/* Palabras flotantes que dan vida al hero */
function sembrarPalabras() {
  const caja = document.getElementById("wv");
  if (!caja) return;
  const palabras = [
    "Suministro real", "Apps por venir", "Ideas", "Oportunidades",
    "Alianzas", "Cuba – Mundo", "Enlace", "Cartera de clientes", "Innovación", "Mayab"
  ];
  caja.innerHTML = "";
  palabras.forEach((p, i) => {
    const s = document.createElement("span");
    s.textContent = p;
    s.style.left = (6 + Math.random() * 78) + "%";
    s.style.animationDuration = (16 + Math.random() * 14) + "s";
    s.style.animationDelay = (Math.random() * 14) + "s";
    s.style.fontSize = (12 + Math.random() * 10) + "px";
    caja.appendChild(s);
  });
}

function anio() {
  const destino = document.getElementById("anio");
  if (destino) destino.textContent = new Date().getFullYear();
}

document.addEventListener("DOMContentLoaded", () => {
  inicializarMenu();
  inicializarExperienciaPagina();
  inicializarContacto();
  inicializarAliados();
  inicializarNecesidades();
  inicializarInteresOfertas();
  inicializarGestion();
  inicializarBusquedaOfertas();
  inicializarSelectorMoneda();
  inicializarDetalleOfertas();
  anio();
  observarRevelados();
  cargarProyectos();
  cargarOfertas();
  cargarTasasCambio();
  animacionHero();
  cargarFotoHero();
  sembrarPalabras();
});
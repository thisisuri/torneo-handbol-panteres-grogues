import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

// Configuración Supabase
const SUPABASE_URL = "https://ouekofkdhejydaopitjt.supabase.co";
const SUPABASE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im91ZWtvZmtkaGVqeWRhb3BpdGp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkzMjQ2MTAsImV4cCI6MjA3NDkwMDYxMH0.xnFACfUHRzIpcNxnK8H0BAOfBSUlMXPek8QPLTxXZ8E";
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// -------------------- Utilidades --------------------
function formatearFecha(fecha) {
  const d = new Date(fecha);
  const dia = String(d.getDate()).padStart(2, "0");
  const mes = String(d.getMonth() + 1).padStart(2, "0");
  const anio = d.getFullYear();
  return `${dia}-${mes}-${anio}`;
}

// -------------------- Partidos --------------------
async function cargarPartidos() {
  const { data: partidos, error } = await supabase.from("partidos").select(`
      id, fecha, lugar, resultado_local, resultado_visitante, observaciones,
      equipo_local (nombre), equipo_visitante (nombre)
    `);
  if (error) return console.error(error);

  partidos.sort((a, b) => new Date(a.fecha) - new Date(b.fecha));

  const equiposSet = new Set();
  partidos.forEach((p) => {
    if (p.equipo_local?.nombre) equiposSet.add(p.equipo_local.nombre);
    if (p.equipo_visitante?.nombre) equiposSet.add(p.equipo_visitante.nombre);
  });
  const todosEquipos = Array.from(equiposSet);

  const tbodyPartidos = document.querySelector("#tabla-partidos tbody");
  tbodyPartidos.innerHTML = "";
  const selectPartido = document.getElementById("select-partido");
  selectPartido.innerHTML = "";

  const placeholderOption = document.createElement("option");
  placeholderOption.textContent = "Selecciona el partido";
  placeholderOption.disabled = true;
  placeholderOption.selected = true;
  selectPartido.appendChild(placeholderOption);

  partidos.forEach((p) => {
    const estado =
      p.resultado_local !== null && p.resultado_visitante !== null
        ? "Jugado"
        : "Pendiente";

    const descansan = todosEquipos.filter(
      (e) =>
        e !== (p.equipo_local?.nombre ?? "") &&
        e !== (p.equipo_visitante?.nombre ?? "")
    );

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${formatearFecha(p.fecha)}</td>
      <td>${p.lugar ?? ""}</td>
      <td>${p.equipo_local?.nombre ?? ""}</td>
      <td>${p.equipo_visitante?.nombre ?? ""}</td>
      <td>${estado}</td>
      <td>${descansan.join(", ")}</td>
    `;
    tbodyPartidos.appendChild(tr);

    const option = document.createElement("option");
    option.value = p.id;
    option.textContent = `${p.equipo_local?.nombre ?? "N/A"} vs ${
      p.equipo_visitante?.nombre ?? "N/A"
    } (${formatearFecha(p.fecha)})`;
    option.dataset.golesLocal = p.resultado_local ?? "";
    option.dataset.golesVisitante = p.resultado_visitante ?? "";
    selectPartido.appendChild(option);
  });

  cargarClasificacion(partidos);
  cargarResultados(partidos);
}

// -------------------- Clasificación --------------------
function cargarClasificacion(partidos) {
  const equipos = {};
  partidos.forEach((p) => {
    const local = p.equipo_local?.nombre ?? null;
    const visitante = p.equipo_visitante?.nombre ?? null;
    if (!local || !visitante) return;

    if (!equipos[local])
      equipos[local] = {
        gf: 0,
        gc: 0,
        puntos: 0,
        ganados: 0,
        empatados: 0,
        perdidos: 0,
      };
    if (!equipos[visitante])
      equipos[visitante] = {
        gf: 0,
        gc: 0,
        puntos: 0,
        ganados: 0,
        empatados: 0,
        perdidos: 0,
      };

    if (p.resultado_local !== null && p.resultado_visitante !== null) {
      equipos[local].gf += p.resultado_local;
      equipos[local].gc += p.resultado_visitante;
      equipos[visitante].gf += p.resultado_visitante;
      equipos[visitante].gc += p.resultado_local;

      if (p.resultado_local > p.resultado_visitante) {
        equipos[local].puntos += 2;
        equipos[local].ganados += 1;
        equipos[visitante].perdidos += 1;
      } else if (p.resultado_local < p.resultado_visitante) {
        equipos[visitante].puntos += 2;
        equipos[visitante].ganados += 1;
        equipos[local].perdidos += 1;
      } else {
        equipos[local].puntos += 1;
        equipos[visitante].puntos += 1;
        equipos[local].empatados += 1;
        equipos[visitante].empatados += 1;
      }
    }
  });

  const tbody = document.querySelector("#tabla-clasificacion tbody");
  tbody.innerHTML = "";
  Object.entries(equipos)
    .sort((a, b) => b[1].puntos - a[1].puntos)
    .forEach(([equipo, stats]) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${equipo}</td>
        <td>${stats.ganados}</td>
        <td>${stats.empatados}</td>
        <td>${stats.perdidos}</td>
        <td>${stats.gf}</td>
        <td>${stats.gc}</td>
        <td>${stats.gf - stats.gc}</td>
        <td>${stats.puntos}</td>
      `;
      tbody.appendChild(tr);
    });
}

// -------------------- Resultados --------------------
function cargarResultados(partidos) {
  const tbody = document.querySelector("#tabla-resultados tbody");
  if (!tbody) return;
  tbody.innerHTML = "";

  partidos.forEach((p) => {
    const tr = document.createElement("tr");

    let resultado =
      p.resultado_local !== null && p.resultado_visitante !== null
        ? `${p.resultado_local} - ${p.resultado_visitante}`
        : "Pendiente de jugar";

    tr.innerHTML = `
      <td>${formatearFecha(p.fecha)}</td>
      <td>${p.equipo_local?.nombre ?? ""}</td>
      <td>${p.equipo_visitante?.nombre ?? ""}</td>
      <td>${resultado}</td>
    `;
    tbody.appendChild(tr);
  });
}

// -------------------- Equipos --------------------
async function cargarEquipos() {
  try {
    const { data: jugadores, error } = await supabase
      .from("jugadores")
      .select("id, nombre, apellido, equipo, capitan")
      .order("equipo", { ascending: true });
    if (error) return console.error(error);

    const lista = document.getElementById("lista-equipos");
    lista.innerHTML = "";

    const equiposMap = {};
    jugadores.forEach((j) => {
      const equipoNombre = `Equipo ${j.equipo ?? "?"}`;
      if (!equiposMap[equipoNombre]) equiposMap[equipoNombre] = [];
      equiposMap[equipoNombre].push(j);
    });

    Object.entries(equiposMap).forEach(([equipo, jugadoresArr]) => {
      jugadoresArr.sort((a, b) => {
        if (a.capitan !== b.capitan) return b.capitan - a.capitan;
        return a.apellido.localeCompare(b.apellido);
      });

      const div = document.createElement("div");
      div.classList.add("equipo");

      div.innerHTML = `<h2>${equipo}</h2>
        <ul>
          ${jugadoresArr
            .map(
              (j) =>
                `<li>${j.nombre} ${j.apellido}${j.capitan ? " (C)" : ""}</li>`
            )
            .join("")}
        </ul>`;

      lista.appendChild(div);
    });

    if (!jugadores || jugadores.length === 0)
      lista.innerHTML = "<p>No hay jugadores registrados todavía.</p>";
  } catch (err) {
    console.error(err);
  }
}

// -------------------- Pestañas --------------------
const tabsList = document.querySelectorAll(".tab");
const contents = document.querySelectorAll(".tab-content");

function activarPestaña(id) {
  tabsList.forEach((tab) =>
    tab.classList.toggle("active", tab.dataset.tab === id)
  );
  contents.forEach((c) => c.classList.toggle("active", c.id === id));
  localStorage.setItem("pestaña-activa", id);

  if (id === "equipos") cargarEquipos();
  if (id === "asistencia") {
    cargarPartidosAsistencia();
    cargarTablaAsistencia();
  }
}

tabsList.forEach((tab) =>
  tab.addEventListener("click", () => activarPestaña(tab.dataset.tab))
);

const pestañaGuardada = localStorage.getItem("pestaña-activa");
if (pestañaGuardada) activarPestaña(pestañaGuardada);
else activarPestaña("clasificacion");

// -------------------- Acta de resultados --------------------
const formActa = document.getElementById("form-resultado");
const selectPartidoActa = document.getElementById("select-partido");
const golesLocal = document.getElementById("goles-local");
const golesVisitante = document.getElementById("goles-visitante");
const observaciones = document.getElementById("observaciones");
const jugadoresExtraDiv = document.getElementById("jugadores-extra");
const penalizacionesDiv = document.getElementById("penalizaciones-cupo");
const btnAñadirExtra = document.getElementById("añadir-jugador-extra");
const btnAñadirPenal = document.getElementById("añadir-penalizacion");

// Renderizar jugadores extra según nueva estructura
function renderContadorJugadoresExtra(equipo, valor = 0) {
  const div = document.createElement("div");
  div.classList.add("extra-item");
  div.innerHTML = `
    <label>${equipo}:
      <input type="number" class="extra-contador" data-equipo="${equipo}" value="${valor}" min="0" max="3">
    </label>
  `;
  jugadoresExtraDiv.appendChild(div);
}

// Renderizar penalizaciones
function renderCheckboxPenalizacion(equipo, valor = false) {
  const div = document.createElement("div");
  div.classList.add("penal-item");
  div.innerHTML = `
    <label>
      <input type="checkbox" class="penal-checkbox" data-equipo="${equipo}" ${
    valor ? "checked" : ""
  }>
      ${equipo}
    </label>
  `;
  penalizacionesDiv.appendChild(div);
}

selectPartidoActa.addEventListener("change", async () => {
  const partidoId = selectPartidoActa.value;
  const { data: partido, error } = await supabase
    .from("partidos")
    .select("*")
    .eq("id", partidoId)
    .single();
  if (error) return console.error(error);

  golesLocal.value = partido.resultado_local ?? "";
  golesVisitante.value = partido.resultado_visitante ?? "";
  observaciones.value = partido.observaciones ?? "";

  // Resetear extra y penalizaciones
  jugadoresExtraDiv.innerHTML = "";
  penalizacionesDiv.innerHTML = "";

  // Mostrar selectores de jugadores extra
  renderContadorJugadoresExtra("local");
  renderContadorJugadoresExtra("visitante");

  // Mostrar penalizaciones
  renderCheckboxPenalizacion("local");
  renderCheckboxPenalizacion("visitante");
});

formActa.addEventListener("submit", async (e) => {
  e.preventDefault();
  const partidoId = selectPartidoActa.value;
  const golesL = parseInt(golesLocal.value);
  const golesV = parseInt(golesVisitante.value);

  const extraItems = jugadoresExtraDiv.querySelectorAll(".extra-contador");
  const penalItems = penalizacionesDiv.querySelectorAll(".penal-checkbox");

  const extra_local = parseInt(extraItems[0].value) || 0;
  const extra_visitante = parseInt(extraItems[1].value) || 0;
  const penal_local = penalItems[0].checked;
  const penal_visitante = penalItems[1].checked;

  const { error: errUpdatePartido } = await supabase
    .from("partidos")
    .update({
      resultado_local: golesL,
      resultado_visitante: golesV,
      observaciones: observaciones.value,
      extra_local,
      extra_visitante,
      penal_local,
      penal_visitante,
    })
    .eq("id", partidoId);

  if (errUpdatePartido) console.error(errUpdatePartido);

  alert("Datos del partido guardados correctamente.");
  cargarPartidos();
});

// -------------------- Asistencia --------------------
const selectPartidoAsistencia = document.getElementById(
  "select-partido-asistencia"
);
const listaJugadoresPartidoDiv = document.getElementById(
  "lista-jugadores-partido"
);
const formAsistencia = document.getElementById("form-asistencia");
const tablaAsistenciaBody = document.querySelector("#tabla-asistencia tbody");

async function cargarPartidosAsistencia() {
  const { data: partidos, error } = await supabase.from("partidos").select("*");
  if (error) return console.error(error);

  selectPartidoAsistencia.innerHTML = "";
  partidos.forEach((p) => {
    const option = document.createElement("option");
    option.value = p.id;
    option.textContent = `${p.equipo_local} vs ${
      p.equipo_visitante
    } (${formatearFecha(p.fecha)})`;
    selectPartidoAsistencia.appendChild(option);
  });
}

selectPartidoAsistencia.addEventListener("change", async () => {
  const partidoId = selectPartidoAsistencia.value;
  const { data: jugadores, error } = await supabase
    .from("jugadores")
    .select("*");
  if (error) return console.error(error);

  listaJugadoresPartidoDiv.innerHTML = "";
  jugadores.forEach((j) => {
    const label = document.createElement("label");
    label.innerHTML = `<input type="checkbox" name="asistencia" value="${j.id}">${j.nombre} ${j.apellido}`;
    listaJugadoresPartidoDiv.appendChild(label);
    listaJugadoresPartidoDiv.appendChild(document.createElement("br"));
  });
});

formAsistencia.addEventListener("submit", async (e) => {
  e.preventDefault();
  const partidoId = selectPartidoAsistencia.value;
  const checkboxes = listaJugadoresPartidoDiv.querySelectorAll(
    'input[name="asistencia"]:checked'
  );
  const asistencias = Array.from(checkboxes).map((c) => c.value);

  const { error } = await supabase
    .from("asistencias")
    .upsert(
      asistencias.map((jugador_id) => ({ partido_id: partidoId, jugador_id }))
    );

  if (error) return console.error(error);
  alert("Asistencias registradas correctamente.");
  cargarTablaAsistencia();
});

async function cargarTablaAsistencia() {
  const { data: asistencias, error } = await supabase.from("asistencias")
    .select(`
    jugador_id, partido_id
  `);
  if (error) return console.error(error);
  tablaAsistenciaBody.innerHTML = "";
  asistencias.forEach((a) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${a.jugador_id}</td><td>${a.partido_id}</td>`;
    tablaAsistenciaBody.appendChild(tr);
  });
}

// -------------------- Scroll Top --------------------
const scrollTopBtn = document.getElementById("scrollTopBtn");
window.addEventListener("scroll", () => {
  scrollTopBtn.style.display = window.scrollY > 200 ? "block" : "none";
});
scrollTopBtn.addEventListener("click", () =>
  window.scrollTo({ top: 0, behavior: "smooth" })
);

// -------------------- Inicialización --------------------
cargarPartidos();
cargarEquipos();
cargarPartidosAsistencia();
cargarTablaAsistencia();

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

  // Tabla de partidos
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
}

// -------------------- Acta de resultados --------------------
const form = document.getElementById("form-resultado");
const selectPartido = document.getElementById("select-partido");
const golesLocalInput = document.getElementById("goles-local");
const golesVisitanteInput = document.getElementById("goles-visitante");
const jugadoresExtraDiv = document.getElementById("jugadores-extra");
const penalizacionesDiv = document.getElementById("penalizaciones-cupo");
const observacionesInput = document.getElementById("observaciones");

// Cargar datos del partido al seleccionarlo
selectPartido.addEventListener("change", async () => {
  const partidoId = selectPartido.value;
  const option = selectPartido.selectedOptions[0];
  golesLocalInput.value = option.dataset.golesLocal;
  golesVisitanteInput.value = option.dataset.golesVisitante;

  // Observaciones
  const { data: partido } = await supabase
    .from("partidos")
    .select("observaciones")
    .eq("id", partidoId)
    .single();
  observacionesInput.value = partido?.observaciones ?? "";

  // Jugadores extra
  const { data: extras } = await supabase
    .from("jugadores_extra_partido")
    .select(
      "id, jugador_id, equipo_origen, equipo_jugado, jugador(nombre, apellido)"
    )
    .eq("partido_id", partidoId);
  renderJugadoresExtra(extras);

  // Penalizaciones
  const { data: penalizaciones } = await supabase
    .from("penalizaciones_cupo")
    .select("*")
    .eq("partido_id", partidoId);
  renderPenalizaciones(penalizaciones);
});

// Renderizar jugadores extra
function renderJugadoresExtra(extras) {
  jugadoresExtraDiv.innerHTML = "";
  extras?.forEach((e) => {
    const div = document.createElement("div");
    div.innerHTML = `
      <span>${e.jugador.nombre} ${e.jugador.apellido} (${e.equipo_origen} → ${e.equipo_jugado})</span>
      <button type="button" data-id="${e.id}" class="borrar-extra">Borrar</button>
    `;
    jugadoresExtraDiv.appendChild(div);
  });
}

// Renderizar penalizaciones
function renderPenalizaciones(penalizaciones) {
  penalizacionesDiv.innerHTML = "";
  penalizaciones?.forEach((p) => {
    const div = document.createElement("div");
    div.innerHTML = `
      <span>${p.equipo} (${p.penalizacion})</span>
      <button type="button" data-id="${p.id}" class="borrar-penal">Borrar</button>
    `;
    penalizacionesDiv.appendChild(div);
  });
}

// Guardar acta
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const id = selectPartido.value;
  const golesLocal = parseInt(golesLocalInput.value);
  const golesVisitante = parseInt(golesVisitanteInput.value);
  const observaciones = observacionesInput.value;

  const { error } = await supabase
    .from("partidos")
    .update({
      resultado_local: golesLocal,
      resultado_visitante: golesVisitante,
      observaciones,
    })
    .eq("id", id);
  if (error) return console.error(error);

  alert("Acta guardada correctamente.");
  cargarPartidos();
});

// -------------------- Borrar jugadores extra y penalizaciones --------------------
jugadoresExtraDiv.addEventListener("click", async (e) => {
  if (!e.target.classList.contains("borrar-extra")) return;
  const id = e.target.dataset.id;
  const { error } = await supabase
    .from("jugadores_extra_partido")
    .delete()
    .eq("id", id);
  if (error) return console.error(error);
  e.target.parentElement.remove();
});

penalizacionesDiv.addEventListener("click", async (e) => {
  if (!e.target.classList.contains("borrar-penal")) return;
  const id = e.target.dataset.id;
  const { error } = await supabase
    .from("penalizaciones_cupo")
    .delete()
    .eq("id", id);
  if (error) return console.error(error);
  e.target.parentElement.remove();
});

// -------------------- Pestañas y carga inicial --------------------
const tabs = document.querySelectorAll(".tab");
const contents = document.querySelectorAll(".tab-content");

function activarPestaña(id) {
  tabs.forEach((tab) => tab.classList.toggle("active", tab.dataset.tab === id));
  contents.forEach((c) => c.classList.toggle("active", c.id === id));
  localStorage.setItem("pestaña-activa", id);

  if (id === "equipos") cargarEquipos();
}

tabs.forEach((tab) =>
  tab.addEventListener("click", () => activarPestaña(tab.dataset.tab))
);

const pestañaGuardada = localStorage.getItem("pestaña-activa");
if (pestañaGuardada) activarPestaña(pestañaGuardada);
else activarPestaña("clasificacion");

// Carga inicial
cargarPartidos();

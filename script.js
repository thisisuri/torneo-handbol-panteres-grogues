import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

// Configuración Supabase
const SUPABASE_URL = "https://ouekofkdhejydaopitjt.supabase.co";
const SUPABASE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im91ZWtvZmtkaGVqeWRhb3BpdGp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkzMjQ2MTAsImV4cCI6MjA3NDkwMDYxMH0.xnFACfUHRzIpcNxnK8H0BAOfBSUlMXPek8QPLTxXZ8E";
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Función para formatear fecha
function formatearFecha(fecha) {
  const d = new Date(fecha);
  const dia = String(d.getDate()).padStart(2, "0");
  const mes = String(d.getMonth() + 1).padStart(2, "0");
  const anio = d.getFullYear();
  return `${dia}-${mes}-${anio}`;
}

// -------------------- Cargar partidos y tabla --------------------
async function cargarPartidos() {
  const { data: partidos, error } = await supabase.from("partidos").select(`
      id, fecha, lugar, resultado_local, resultado_visitante,
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

  // Placeholder para acta del partido
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

// -------------------- Equipos --------------------
async function cargarEquipos() {
  try {
    const { data: jugadores, error } = await supabase
      .from("jugadores")
      .select("id, nombre, apellido, equipo")
      .order("equipo");
    if (error) return console.error(error);

    const lista = document.getElementById("lista-equipos");
    lista.innerHTML = "";

    const equiposMap = {};
    jugadores.forEach((j) => {
      const equipoNombre = `Equipo ${j.equipo ?? "?"}`;
      if (!equiposMap[equipoNombre]) equiposMap[equipoNombre] = [];
      equiposMap[equipoNombre].push(`${j.nombre} ${j.apellido}`);
    });

    Object.entries(equiposMap).forEach(([equipo, jugadoresArr]) => {
      const div = document.createElement("div");
      div.classList.add("equipo");
      div.innerHTML = `<h2>${equipo}</h2><ul>${jugadoresArr
        .map((j) => `<li>${j}</li>`)
        .join("")}</ul>`;
      lista.appendChild(div);
    });

    if (!jugadores || jugadores.length === 0)
      lista.innerHTML = "<p>No hay jugadores registrados todavía.</p>";
  } catch (err) {
    console.error(err);
  }
}

// -------------------- Pestañas --------------------
const tabs = document.querySelectorAll(".tab");
const contents = document.querySelectorAll(".tab-content");

function activarPestaña(id) {
  tabs.forEach((tab) => tab.classList.toggle("active", tab.dataset.tab === id));
  contents.forEach((c) => c.classList.toggle("active", c.id === id));
  localStorage.setItem("pestaña-activa", id);

  if (id === "equipos") cargarEquipos();
  if (id === "asistencia") cargarPartidosAsistencia();
}

tabs.forEach((tab) =>
  tab.addEventListener("click", () => activarPestaña(tab.dataset.tab))
);

const pestañaGuardada = localStorage.getItem("pestaña-activa");
if (pestañaGuardada) activarPestaña(pestañaGuardada);
else activarPestaña("clasificacion");

// -------------------- Formulario de resultados --------------------
const form = document.getElementById("form-resultado");
const selectPartido = document.getElementById("select-partido");
const golesLocalInput = document.getElementById("goles-local");
const golesVisitanteInput = document.getElementById("goles-visitante");

selectPartido.addEventListener("change", () => {
  const option = selectPartido.selectedOptions[0];
  golesLocalInput.value = option.dataset.golesLocal;
  golesVisitanteInput.value = option.dataset.golesVisitante;
});

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const id = selectPartido.value;
  const golesLocal = parseInt(golesLocalInput.value);
  const golesVisitante = parseInt(golesVisitanteInput.value);

  const { error } = await supabase
    .from("partidos")
    .update({
      resultado_local: golesLocal,
      resultado_visitante: golesVisitante,
    })
    .eq("id", id);

  if (error) return console.error(error);
  cargarPartidos();
});

// -------------------- Pestaña de asistencia --------------------
const selectPartidoAsistencia = document.getElementById(
  "select-partido-asistencia"
);
const listaJugadoresDiv = document.getElementById("lista-jugadores");
const formAsistencia = document.getElementById("form-asistencia");

async function cargarPartidosAsistencia() {
  const { data: partidos, error } = await supabase
    .from("partidos")
    .select(`id, fecha, equipo_local (nombre), equipo_visitante (nombre)`)
    .order("fecha");
  if (error) return console.error(error);

  selectPartidoAsistencia.innerHTML = "";

  // Placeholder
  const placeholderOption = document.createElement("option");
  placeholderOption.textContent = "Selecciona el partido";
  placeholderOption.disabled = true;
  placeholderOption.selected = true;
  selectPartidoAsistencia.appendChild(placeholderOption);

  partidos.forEach((p) => {
    const option = document.createElement("option");
    option.value = p.id;
    option.textContent = `${p.equipo_local.nombre} vs ${
      p.equipo_visitante.nombre
    } (${formatearFecha(p.fecha)})`;
    selectPartidoAsistencia.appendChild(option);
  });

  // No cargamos jugadores automáticamente hasta que se seleccione un partido
}

selectPartidoAsistencia.addEventListener("change", () => {
  cargarJugadoresAsistencia(selectPartidoAsistencia.value);
});

async function cargarJugadoresAsistencia(partidoId) {
  listaJugadoresDiv.innerHTML = "Cargando...";

  const { data: partido, error } = await supabase
    .from("partidos")
    .select(`equipo_local(nombre), equipo_visitante(nombre)`)
    .eq("id", partidoId)
    .single();
  if (error) return console.error(error);

  const equipoNombres = [
    partido.equipo_local.nombre,
    partido.equipo_visitante.nombre,
  ];

  const { data: jugadores, error: errJugadores } = await supabase
    .from("jugadores")
    .select("id, nombre, apellido, equipo")
    .in("equipo", equipoNombres)
    .order("equipo");
  if (errJugadores) return console.error(errJugadores);

  const { data: asistencias } = await supabase
    .from("asistencia")
    .select("jugador_id, presente")
    .eq("partido_id", partidoId);

  const asistMap = {};
  if (asistencias)
    asistencias.forEach((a) => (asistMap[a.jugador_id] = a.presente));

  listaJugadoresDiv.innerHTML = "";
  jugadores.forEach((j) => {
    const div = document.createElement("div");
    div.innerHTML = `<label>
      <input type="checkbox" value="${j.id}" ${asistMap[j.id] ? "checked" : ""}>
      ${j.nombre} ${j.apellido}
    </label>`;
    listaJugadoresDiv.appendChild(div);
  });
}

formAsistencia.addEventListener("submit", async (e) => {
  e.preventDefault();
  const partidoId = selectPartidoAsistencia.value;
  const checkboxes = listaJugadoresDiv.querySelectorAll("input[type=checkbox]");

  for (const cb of checkboxes) {
    const jugadorId = parseInt(cb.value);
    const presente = cb.checked;

    const { error } = await supabase
      .from("asistencia")
      .upsert({ partido_id: partidoId, jugador_id: jugadorId, presente })
      .eq("partido_id", partidoId)
      .eq("jugador_id", jugadorId);
    if (error) console.error(error);
  }

  alert("Asistencia guardada correctamente.");
});

// -------------------- Carga inicial --------------------
cargarPartidos();

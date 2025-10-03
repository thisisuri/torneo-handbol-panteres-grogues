import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

// -------------------- Configuración Supabase --------------------
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

// -------------------- DOM Elements --------------------
const form = document.getElementById("form-resultado");
const selectPartido = document.getElementById("select-partido");
const golesLocalInput = document.getElementById("goles-local");
const golesVisitanteInput = document.getElementById("goles-visitante");
const observacionesInput = document.getElementById("observaciones");
const jugadoresExtraDiv = document.getElementById("jugadores-extra");
const btnAñadirExtra = document.getElementById("añadir-jugador-extra");
const penalizacionesDiv = document.getElementById("penalizaciones-cupo");
const btnAñadirPenal = document.getElementById("añadir-penalizacion");

// -------------------- Carga de partidos --------------------
async function cargarPartidos() {
  const { data: partidos, error } = await supabase.from("partidos").select(`
    id, fecha, lugar, resultado_local, resultado_visitante, observaciones,
    equipo_local(nombre), equipo_visitante(nombre)
  `);

  if (error) return console.error(error);

  partidos.sort((a, b) => new Date(a.fecha) - new Date(b.fecha));

  // Cargar select
  selectPartido.innerHTML = `<option disabled selected>Selecciona el partido</option>`;
  partidos.forEach((p) => {
    const option = document.createElement("option");
    option.value = p.id;
    option.textContent = `${p.equipo_local.nombre} vs ${
      p.equipo_visitante.nombre
    } (${formatearFecha(p.fecha)})`;
    selectPartido.appendChild(option);
  });

  cargarClasificacion(partidos);
  cargarResultados(partidos);
}

// -------------------- Clasificación --------------------
function cargarClasificacion(partidos) {
  const equipos = {};
  partidos.forEach((p) => {
    const local = p.equipo_local?.nombre;
    const visitante = p.equipo_visitante?.nombre;
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
        equipos[local].ganados++;
        equipos[visitante].perdidos++;
      } else if (p.resultado_local < p.resultado_visitante) {
        equipos[visitante].puntos += 2;
        equipos[visitante].ganados++;
        equipos[local].perdidos++;
      } else {
        equipos[local].puntos++;
        equipos[visitante].puntos++;
        equipos[local].empatados++;
        equipos[visitante].empatados++;
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
  tbody.innerHTML = "";
  partidos.forEach((p) => {
    const tr = document.createElement("tr");
    const resultado =
      p.resultado_local !== null && p.resultado_visitante !== null
        ? `${p.resultado_local} - ${p.resultado_visitante}`
        : "Pendiente";
    tr.innerHTML = `
      <td>${formatearFecha(p.fecha)}</td>
      <td>${p.equipo_local.nombre}</td>
      <td>${p.equipo_visitante.nombre}</td>
      <td>${resultado}</td>
    `;
    tbody.appendChild(tr);
  });
}

// -------------------- Cargar datos de partido seleccionado --------------------
selectPartido.addEventListener("change", async () => {
  const id = selectPartido.value;
  if (!id) return;

  const { data: partido, error } = await supabase
    .from("partidos")
    .select(`resultado_local, resultado_visitante, observaciones`)
    .eq("id", id)
    .single();
  if (error) return console.error(error);

  golesLocalInput.value = partido.resultado_local ?? "";
  golesVisitanteInput.value = partido.resultado_visitante ?? "";
  observacionesInput.value = partido.observaciones ?? "";

  // Cargar jugadores extra
  const { data: extras } = await supabase
    .from("jugadores_extra_partido")
    .select("*")
    .eq("partido_id", id);
  jugadoresExtraDiv.innerHTML = "";
  extras.forEach((e) => renderInputJugadorExtra(e));

  // Cargar penalizaciones
  const { data: penalizaciones } = await supabase
    .from("penalizaciones_cupo")
    .select("*")
    .eq("partido_id", id);
  penalizacionesDiv.innerHTML = "";
  penalizaciones.forEach((p) => renderInputPenalizacion(p));
});

// -------------------- Funciones dinámicas --------------------
function renderInputJugadorExtra(extra = {}) {
  const div = document.createElement("div");
  div.classList.add("jugador-extra");
  div.innerHTML = `
    <label>
      Jugador:
      <input type="text" name="nombre_jugador" value="${
        extra.nombre || ""
      }" placeholder="Nombre jugador">
    </label>
    <label>
      Equipo origen:
      <input type="text" name="equipo_origen" value="${
        extra.equipo_origen || ""
      }" placeholder="Equipo original">
    </label>
    <label>
      Equipo jugado:
      <input type="text" name="equipo_jugado" value="${
        extra.equipo_jugado || ""
      }" placeholder="Equipo donde juega">
    </label>
    <button type="button" class="borrar-extra">Borrar</button>
  `;
  jugadoresExtraDiv.appendChild(div);
  div
    .querySelector(".borrar-extra")
    .addEventListener("click", () => div.remove());
}

btnAñadirExtra.addEventListener("click", () => renderInputJugadorExtra());

function renderInputPenalizacion(penal = {}) {
  const div = document.createElement("div");
  div.classList.add("penalizacion-cupo");
  div.innerHTML = `
    <label>
      Equipo:
      <input type="text" name="equipo_penal" value="${
        penal.equipo || ""
      }" placeholder="Equipo">
    </label>
    <label>
      Penalización:
      <input type="number" name="valor_penal" value="${
        penal.penalizacion || 0
      }" min="-1" max="1">
    </label>
    <button type="button" class="borrar-penal">Borrar</button>
  `;
  penalizacionesDiv.appendChild(div);
  div
    .querySelector(".borrar-penal")
    .addEventListener("click", () => div.remove());
}

btnAñadirPenal.addEventListener("click", () => renderInputPenalizacion());

// -------------------- Guardar acta --------------------
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const id = selectPartido.value;
  const golesLocal = parseInt(golesLocalInput.value);
  const golesVisitante = parseInt(golesVisitanteInput.value);
  const observaciones = observacionesInput.value;

  // Actualizar resultados y observaciones
  await supabase
    .from("partidos")
    .update({
      resultado_local: golesLocal,
      resultado_visitante: golesVisitante,
      observaciones,
    })
    .eq("id", id);

  // Guardar jugadores extra
  const jugadoresExtra = Array.from(
    jugadoresExtraDiv.querySelectorAll(".jugador-extra")
  ).map((div) => ({
    partido_id: id,
    nombre: div.querySelector('input[name="nombre_jugador"]').value,
    equipo_origen: div.querySelector('input[name="equipo_origen"]').value,
    equipo_jugado: div.querySelector('input[name="equipo_jugado"]').value,
  }));
  await supabase.from("jugadores_extra_partido").delete().eq("partido_id", id);
  for (let j of jugadoresExtra)
    if (j.nombre) await supabase.from("jugadores_extra_partido").insert(j);

  // Guardar penalizaciones
  const penalizaciones = Array.from(
    penalizacionesDiv.querySelectorAll(".penalizacion-cupo")
  ).map((div) => ({
    partido_id: id,
    equipo: div.querySelector('input[name="equipo_penal"]').value,
    penalizacion: parseInt(
      div.querySelector('input[name="valor_penal"]').value
    ),
  }));
  await supabase.from("penalizaciones_cupo").delete().eq("partido_id", id);
  for (let p of penalizaciones)
    if (p.equipo) await supabase.from("penalizaciones_cupo").insert(p);

  alert("Acta guardada correctamente");
  cargarPartidos();
});

// -------------------- Carga inicial --------------------
cargarPartidos();

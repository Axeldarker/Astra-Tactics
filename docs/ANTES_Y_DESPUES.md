# TacticsMZ 0.3: antes y después

Esta nota explica cómo se hacía cada cosa en la **v0.2.0** y cómo se hace con la **v0.3.0**.

**Lo más importante:**

- **No se rompe nada.** Todos los comandos de la v0.2 siguen ahí, con los mismos campos y valores. Los mapas y partidas guardadas que ya tienes funcionan igual. Las pruebas automáticas lo comprueban: el mismo mapa clásico, compilado y jugado con el motor viejo y con el nuevo, da exactamente el mismo resultado.
- **Lo nuevo es un atajo.** Los comandos marcados con ★ se traducen por dentro a los comandos clásicos antes de empezar la misión. No hay reglas nuevas que aprender: un ★ Enemigo es literalmente un "Colocar unidad" ya rellenado.
- **De 9 plugins a 3.** TacticsEngine (el motor), TacticsUI (la interfaz) y TacticsMZ (los comandos).

---

## 0. Instalación

| | Antes (v0.2) | Ahora (v0.3) |
|---|---|---|
| Archivos | 9 plugins: TacticsSystem, TacticsCommands, TacticsRules, TacticsView, TacticsGraphics, TacticsPresentation, TacticsScenes, TacticsData, TacticsMZ | 3 plugins: **TacticsEngine**, **TacticsUI**, **TacticsMZ** |
| Orden | Había que respetar un orden exacto de 9 | TacticsEngine → TacticsUI → TacticsMZ (el Administrador de plugins avisa si está mal, porque usan `@base` y `@orderAfter`) |
| Si te equivocas | Errores raros al cargar | Mensaje claro: "falta TacticsEngine", "falta TacticsUI" o "hay plugins antiguos activos" |

**Cómo actualizar un proyecto existente:**

1. Haz una copia de seguridad del proyecto.
2. Copia `dist/TacticsEngine.js`, `dist/TacticsUI.js` y `dist/TacticsMZ.js` a `js/plugins/` (TacticsMZ.js sustituye al viejo).
3. En el Administrador de plugins, **desactiva o borra** TacticsSystem, TacticsCommands, TacticsRules, TacticsView, TacticsGraphics, TacticsPresentation, TacticsScenes y TacticsData.
4. Añade TacticsEngine y TacticsUI **encima** de TacticsMZ. Abre TacticsMZ y pulsa Aceptar para que el editor lea los parámetros nuevos.

El plugin sigue llamándose `TacticsMZ`, así que todos los comandos que ya pusiste en tus eventos siguen enlazados.

---

## 1. Crear un enemigo

**Antes:** un evento con **Colocar unidad**, que tiene unos 22 campos: personaje, clase, nombre, **equipo (que por defecto es Aliados, así que era fácil olvidarse de cambiarlo)**, nivel, arma, objeto, comportamiento, es jefe, deja inventario, prioridad de IA, inventario avanzado, estadísticas, dominio, color, solo si reclutado, variante, perfil de crecimiento, niveles previos, constitución, subgrupo y afinidad.

**Ahora:** un evento con **★ Enemigo**:

| Campo | Qué pones | Si lo dejas vacío |
|---|---|---|
| Clase | La clase de F9 | Obligatoria, salvo que uses una plantilla |
| Nivel | 1 a 20 | 1 (o el de la plantilla) |
| Rol | Soldado, Guardia, Torreta, **Jefe**, Curandero, Ladrón, Saqueador, Patrulla | Soldado |
| Nombre | Opcional | El nombre de la clase |
| Arma / Objeto | Opcional, eligiéndolo de la lista de F9 | El arma de la clase / ninguno |
| Suelta lo que lleva | Casilla | No |

El equipo siempre es Enemigos. Ya no hay que acordarse de cambiarlo.

**Los roles** agrupan varias opciones en una sola elección:

| Rol | Equivale en "Colocar unidad" a |
|---|---|
| Soldado | Comportamiento = Avanzar y atacar |
| Guardia | Comportamiento = Guardar posición (radio de la clase, 3 por defecto) |
| Torreta | Comportamiento = Mantener posición |
| **Jefe** | Mantener posición + Es jefe + Deja inventario al caer |
| Curandero | Curar y apoyar |
| Ladrón | Buscar tesoros |
| Saqueador | Saquear |
| Patrulla | Patrullar |

¿Necesitas algo raro, como estadísticas a mano, variante gráfica, subgrupo o afinidad? Usa **Colocar unidad** como siempre. Para casos especiales sigue siendo la herramienta adecuada.

---

## 2. Enemigos repetidos: plantillas

**Antes:** cada bandido del mapa era un Colocar unidad con todo rellenado a mano. Si querías subirles el nivel, tocaba editar 15 eventos.

**Ahora:** en **Administrador de plugins → TacticsMZ → Plantillas de enemigo** defines cada tipo una sola vez:

```
Nombre: Bandido        Clase: Bárbaro   Nivel: 4   Rol: Soldado   Arma: Hacha de hierro
Nombre: Arquero élite  Clase: Arquero   Nivel: 9   Rol: Guardia   Arma: Arco de acero   Suelta: Sí
Nombre: Jefe Garm      Clase: General   Nivel: 12  Rol: Jefe
```

Luego cada enemigo es un **★ Enemigo** donde solo escribes `Bandido` en *Plantilla*. Lo que pongas en el propio comando manda sobre la plantilla: por ejemplo `Plantilla: Bandido`, `Nivel: 6` crea un bandido de nivel 6. El nombre de la plantilla no distingue mayúsculas ni tildes.

---

## 3. Aliados y el líder

**Antes:**
1. Colocar unidad → Personaje = Ari, Equipo = Aliados.
2. Ir al evento de **Configurar misión** y escribir en *Unidad líder* el **ID del evento** de Ari.
3. Escribir también ese ID en *Unidades protegidas*, porque **el líder no hacía perder la partida al caer** si no estaba en esa lista.

**Ahora:** **★ Aliado** → Personaje = Ari y marca **Es el líder**. Eso lo nombra líder de la misión y lo añade a protegidos: si cae, se pierde. Los demás campos son el nivel (0 = el de F9) y *Solo si ya fue reclutado*, para campañas.

---

## 4. La misión

**Antes:** **Configurar misión** era obligatorio. Sin él salía el error *"El mapa no tiene Configurar misión"*.

**Ahora:** es **opcional**. Si no lo pones:

- Título = el *Nombre visible* del mapa en MZ.
- Victoria = **Conquistar** si hay alguna *Casilla de conquista* y **Eliminar enemigos** si no.
- Líder = el aliado marcado como líder.
- Oro inicial 500, sin niebla y sin límite de turnos (los mismos valores por defecto de antes).

Si quieres otra victoria (derrotar jefes, sobrevivir N turnos, etc.), pon **Configurar misión** como siempre. Funciona igual que antes.

**Una misión completa en 3 pasos:**

1. Un evento con **★ Aliado** (Ari, Es el líder).
2. Unos cuantos eventos con **★ Enemigo** (clase y nivel).
3. En un mapa normal, un evento con **Abrir misión** que apunte a este mapa.

---

## 5. Refuerzos

**Antes**, para "en el turno 3 aparece un caballero en la esquina", hacían falta **dos eventos y cuatro comandos**:

```
Evento 12 (en la esquina):  Colocar unidad (Equipo: Enemigos, Clase: Caballero…)
                            Plantilla de refuerzo
Evento 13 (cualquiera):     Cuándo ejecutar (Comienzo de fase, Equipo: Enemigos, Turno: 3)
                            Crear refuerzo (Evento plantilla: 12, X: 19, Y: 0)
```

Y había que copiar a mano el ID 12 y las coordenadas X/Y. Para repetirlo cada 2 turnos tocaba montar un *Si se cumple → Periodicidad*.

**Ahora**, **un evento y dos comandos**:

```
Evento 12 (en la esquina):  ★ Enemigo (Caballero, nivel 5)
                            ★ Refuerzo (Turno de llegada: 3)
```

| Campo de ★ Refuerzo | Para qué |
|---|---|
| Turno de llegada | Turno en que aparece (por defecto, 2) |
| Fase | Por defecto, la del equipo de la unidad: un enemigo llega en la fase enemiga |
| Repetir cada N turnos | 0 = una vez; 2 = turnos 3, 5, 7… |
| …o al activar este interruptor | Llega cuando se active el interruptor (en vez de por turno) |
| Cuántas copias | Varias unidades iguales; se colocan en casillas libres cercanas |
| Casilla X / Y | −1 = la casilla del propio evento (lo normal) |

También funciona debajo de **★ Aliado** o de **Colocar unidad**, por ejemplo para aliados que llegan a ayudar.

---

## 6. Cofres, puertas, aldeas y tiendas

**Antes:** todo era **Configurar interacción**, con 18 campos mezclados (los del coliseo, los de la puerta y los de la tienda juntos). La recompensa se indicaba con *Tipo de recompensa* + *ID numérico*, así que había que buscar el número en F9. La tienda se rellenaba como una lista de estructuras (tipo, ID, existencias y precio por cada artículo).

**Ahora:** un comando por cosa, con solo sus campos:

| Comando | Campos | Notas |
|---|---|---|
| **★ Cofre** | Objeto **o** Arma (se eligen de la lista de F9), Oro | Se abre con llave o con Cerrajería, como antes |
| **★ Puerta** | Ancho, Alto | 1×1 por defecto, en la casilla del evento |
| **★ Aldea** | Nombre, Texto, Objeto o Arma de regalo, Oro, Unidad que se une | **Los comandos que pongas debajo, en el mismo evento, se ejecutan al visitar.** Antes había que crear otro evento y escribir su ID en *Evento a ejecutar*. |
| **★ Tienda** | Nombre, Armas en venta `1,2,5`, Objetos en venta `1,3` | Existencias infinitas y precio de F9 |

Coliseo, puertas en grupo, credencial secreta o terreno tras abrir: **Configurar interacción** sigue ahí.

---

## 7. Reclutar hablando

**Antes:** **Conversación de unidades** con *Primera unidad* = ID del evento del líder, *Segunda unidad* = ID del evento del enemigo y *Reclutar segunda unidad* = Sí. Si querías diálogo largo o recompensas, otro evento más con su ID.

**Ahora:** en el evento del propio enemigo, debajo de ★ Enemigo, pones **★ Reclutable** (texto opcional). Quién recluta: 0 = el líder. Los comandos que pongas debajo (diálogos, retratos, oro…) se ejecutan al hablar.

---

## 8. Eventos de historia (Cuándo ejecutar)

No cambia nada: **Cuándo ejecutar** + acciones sigue siendo la forma de hacer escenas, diálogos de inicio, eventos por turno, etc. Muchos casos que antes necesitaban un evento aparte ahora se resuelven solos con **★ Refuerzo**, **★ Aldea** y **★ Reclutable**.

---

## 9. Base de datos (F9): notas sin JSON

**Antes**, todo iba en JSON dentro de `<Tactics>`, con sus comillas y llaves:

```
<Tactics>{"moveType":"flying","promotions":[7],"stats":{"health":24,"power":6,"magic":2,"skill":7,"speed":9,"luck":4,"defense":4,"resistance":6,"move":7,"build":5}}</Tactics>
```

Un problema escondido: si escribías `"stats":{"move":7}` para cambiar solo el movimiento, **se perdían las demás estadísticas** de la clase de F9, porque el JSON sustituye el bloque entero.

**Ahora** hay dos formas más sencillas. Las dos solo tocan lo que escribes y el resto se queda como está:

**Etiquetas sueltas**, una por cosa:

```
<Tipo: volador>
<Mov: 7>
<Promociona: 7>
```

**Bloque por líneas**, sin comillas ni llaves:

```
<Tactics>
tipo: volador
mov: 7
promociona: 7
</Tactics>
```

El JSON de siempre **sigue funcionando exactamente igual**.

### Etiquetas disponibles

Las etiquetas no distinguen mayúsculas ni tildes: `<Crítico>` y `<critico>` son lo mismo.

**Clases y personajes**

| Etiqueta | Ejemplo | Qué hace |
|---|---|---|
| Una estadística | `<Mov: 7>` `<Fue: 8>` `<PV: 30>` | Fija esa estadística base (PV, Fue, Mag, Hab, Vel, Suerte, Def, Res, Mov, Con) |
| `Stats` | `<Stats: PV 30, Fue 8, Vel 6>` | Varias a la vez |
| `Crecimientos` | `<Crecimientos: PV 70, Fue 45>` | Porcentajes de crecimiento |
| `Tipo` (clase) | `<Tipo: volador>` | a pie, montado, volador o acorazado |
| `Armas` (clase) | `<Armas: espada, lanza>` | espada, lanza, hacha, arco, magia, bastón |
| `Promociona` (clase) | `<Promociona: 7, 8>` | Clases a las que puede promocionar |
| `Nivel promoción` / `Nivel máximo` | `<Nivel promoción: 10>` | |
| `Inventario` | `<Inventario: arma 2, objeto 1 x2>` | Inventario inicial |
| `Capacidad`, `Radio guardia`, `Visión` (clase) | `<Radio guardia: 4>` | |
| `Habilidades` | `<Habilidades: 3, 5>` | IDs de habilidades de F9 |
| `Frase de muerte` (personaje) | `<Frase de muerte: Lo siento…>` | |

**Armas**

| Etiqueta | Ejemplo |
|---|---|
| `Tipo` | `<Tipo: lanza>` |
| `Poder`, `Golpe`, `Crítico`, `Peso`, `Usos`, `Rango` | `<Golpe: 90>` `<Usos: 40>` |
| `Alcance` | `<Alcance: 1-2>` o `<Alcance: 2>` |
| `Mágica` | `<Mágica>` |
| `Efectivo` | `<Efectivo: volador, montado>` |
| `Bastón` | `<Bastón: curar 10>` |
| `Estado` | `<Estado: 1 2>` (estado 1 durante 2 turnos) |

**Objetos**

| Etiqueta | Ejemplo |
|---|---|
| `Efecto` | `<Efecto: curar 20>` `<Efecto: tónico fue 2>` `<Efecto: promoción 7>` `<Efecto: antídoto>` |
| `Llave` | `<Llave: cofre>` `<Llave: puerta>` `<Llave: todas>` |
| `Usos`, `Precio`, `Alcance` | `<Usos: 3>` |
| `Accesorio`, `Ligado`, `Credencial` | `<Credencial>` |

**Habilidades y estados** (se pueden poner varias)

```
<Efecto: robar>
<Efecto: drenar 30>          (30 % de probabilidad)
<Efecto: stat vel -3>        (estado: -3 a velocidad)
<Efecto: veneno 3>
```

Nombres admitidos: robar, cerrajería, paso ligero, paso de reserva, iniciativa, ruptura, drenar, cobertura, anti crítico, reducir daño, ignorar defensa, ráfaga, concentración, interrupción, último esfuerzo, remate, veneno, regenerar y stat. Cualquier efecto del motor también vale con su nombre en inglés y `clave=valor`, por ejemplo `<Efecto: reduceDamage chance=30 value=0.5>`.

Dentro del bloque `<Tactics>` también puedes usar cualquier clave del motor en inglés (`hits: 2`, `spell: fire`), igual que en JSON pero sin comillas.

Fuera del bloque `<Tactics>` solo se leen las etiquetas de esta lista. Las de otros plugins se ignoran.

---

## 10. Para programadores: cómo está organizado

```
src/
  core/     01_System, 02_Commands, 03_Rules, 04_Data   ← código original, apenas tocado
            05_Notes  (nuevo)  lectura de F9 + notas simplificadas
            06_Easy   (nuevo)  comandos ★ y plantillas
  ui/       01_View, 02_Graphics, 03_Presentation, 04_Scenes
  mz/       Bridge.js (unión con MZ) + help.txt
tools/build.js   genera dist/ y la cabecera de comandos
test/            pruebas en Node (node --test)
dist/            los 3 plugins que se copian al proyecto
```

- **Una sola fuente de verdad para los comandos.** Antes, TacticsMZ.js tenía unas 2.100 líneas de anotaciones `@command/@arg` escritas a mano que repetían el catálogo de TacticsCommands. Ahora `tools/build.js` las genera desde el catálogo. Se comprobó que los 72 comandos clásicos y las 4 estructuras salen idénticos al original.
- **Utilidades compartidas.** `T.fields` (constructores de campos), `T.addCommand` / `T.extendCommand` (añadir comandos o campos sin tocar el catálogo base), `T.parseNote`, `T.readDatabase` (antes estaba dentro de TacticsMZ.js y solo funcionaba en MZ; ahora es parte del núcleo y se puede probar) y `T.desugarMap` (traducción de ★ a comandos clásicos).
- **El núcleo funciona sin MZ.** TacticsEngine se carga en Node, y eso permite tener pruebas automáticas: `npm test` (23 pruebas: comandos ★, notas y compatibilidad con la v0.2).
- **Para cambiar algo:** edita `src/`, ejecuta `node tools/build.js` y copia `dist/` al proyecto. `node tools/build.js --check` avisa si dist/ no está al día.

---

## 11. Compatibilidad y cosas a vigilar

| Tema | Estado |
|---|---|
| Mapas con comandos clásicos | ✅ Idénticos. Hay una prueba que compila y juega el mismo mapa con el motor viejo y el nuevo y compara el resultado. |
| Partidas guardadas | ✅ Mismo formato (versión 1). |
| Notas `<Tactics>{JSON}</Tactics>` | ✅ Se leen igual que antes; también hay una prueba para eso. |
| Plugins antiguos activos a la vez | ⚠️ Hay que desactivarlos. Si no, TacticsEngine se niega a cargar con un mensaje que dice cuáles son. |
| Etiquetas fuera de `<Tactics>` | ⚠️ Antes se ignoraban todas. Ahora se leen las de la lista de arriba (`<Mov: …>`, `<Tipo: …>`, `<Efecto: …>`…). Si otro plugin tuyo usa una etiqueta con el mismo nombre, revísala. |
| Probado dentro de RPG Maker MZ | ⚠️ **Pendiente.** Las pruebas se hicieron en Node con el motor real y con MZ simulado para comprobar la carga de los 3 plugins. Falta abrir el proyecto en el editor y jugar un mapa. |

---

## 12. Siguientes ideas (no incluidas todavía)

- **Tipos de arma por nombre:** leer los nombres de *Tipos → Tipos de arma* de MZ (Espada, Lanza…) para que el triángulo de armas funcione sin etiquetas. Ahora mismo, sin la etiqueta `<Armas: …>`, los tipos se guardan con su número de MZ y el triángulo no los reconoce. No lo activé porque cambiaría los dominios de armas de partidas guardadas.
- **Comando "Revisar mapa"**, que liste los problemas de una misión (enemigos sin arma, refuerzos fuera de los límites…) antes de jugarla.
- **Ordenar la interfaz:** TacticsUI sigue siendo el código original reempaquetado. Se puede dividir y limpiar más adelante, ahora que hay pruebas que protegen el motor.

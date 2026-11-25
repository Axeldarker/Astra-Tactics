# Astra Editor: guía de uso

Astra Editor es el editor visual de misiones de **Astra Tactics** (TacticsMZ). Abres tu proyecto de RPG Maker MZ, ves tu mapa tal cual es y colocas enemigos, aliados, cofres, aldeas y todo lo demás **con un clic**.

Lo que colocas se guarda como **eventos normales de MZ** con los comandos ★ de TacticsMZ. No hay formatos raros: si mañana dejas de usar Astra, todo sigue funcionando y puedes editarlo en MZ.

---

## Índice

1. [Qué necesitas](#1-qué-necesitas)
2. [Tu primera misión en 5 minutos](#2-tu-primera-misión-en-5-minutos)
3. [La pantalla](#3-la-pantalla)
4. [Herramientas](#4-herramientas)
5. [Editar lo que has colocado](#5-editar-lo-que-has-colocado)
6. [La misión y el semáforo](#6-la-misión-y-el-semáforo)
7. [Pintar terreno](#7-pintar-terreno)
8. [Vistas y zoom](#8-vistas-y-zoom)
9. [Guardar y probar en MZ](#9-guardar-y-probar-en-mz)
10. [Actualizar los plugins desde Astra](#10-actualizar-los-plugins-desde-astra)
11. [Plantillas de enemigo](#11-plantillas-de-enemigo)
12. [Base de datos](#12-base-de-datos)
13. [Animaciones de batalla y sprites (FE Essentials)](#13-animaciones-de-batalla-y-sprites-fe-essentials)
14. [Atajos de teclado](#14-atajos-de-teclado)
15. [Problemas frecuentes](#15-problemas-frecuentes)
16. [Para desarrolladores](#16-para-desarrolladores)

---

## 1. Qué necesitas

- **Google Chrome** o **Microsoft Edge** (versión actual). Firefox y Safari todavía no permiten abrir carpetas desde una página.
- El archivo **`AstraEditor.html`** (está en `dist/`). No hay que instalar nada: es un único archivo.
- Tu proyecto de RPG Maker MZ.

> 🔒 Tus archivos no salen de tu ordenador. Astra no usa internet: lee y escribe directamente en la carpeta que le das.

---

## 2. Tu primera misión en 5 minutos

1. **Cierra RPG Maker MZ** (ver [§9](#9-guardar-y-probar-en-mz) para saber por qué).
2. Haz **doble clic en `AstraEditor.html`**. Si se abre en otro navegador, haz clic derecho → *Abrir con* → Chrome o Edge.
3. Pulsa **📂 Abrir proyecto de RPG Maker MZ** y elige la carpeta del juego (la que contiene `game.rmmzproject`). Chrome te pedirá permiso para editar archivos: acepta.
   La próxima vez tendrás un botón **↻ Reabrir** para no tener que buscarla.
4. Si tu proyecto usa TacticsMZ 0.2, Astra te ofrecerá **actualizar los plugins**. Acepta (ver [§10](#10-actualizar-los-plugins-desde-astra)).
5. Arriba a la izquierda, **elige el mapa** de la batalla.
6. En la paleta de la izquierda pulsa **Aliado** (o la tecla `3`) y haz clic en una casilla. A la derecha elige el personaje y marca **Es el líder**.
7. Pulsa **Enemigo** (`2`) y haz clic donde quieras enemigos. Cambia la clase y el nivel a la derecha. **Cada enemigo nuevo copia los ajustes del anterior**, así que poner 10 soldados iguales son 10 clics.
8. Mira el **semáforo** de arriba: 🟢 significa que la misión está lista.
9. Pulsa **💾 Guardar** (o `Ctrl+S`).
10. Abre el proyecto en MZ y pulsa **Probar**.

---

## 3. La pantalla

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ ✦ ASTRA │ Mapa ▾ │ ⚑ Misión │ ↶ ↷ │      🟢 semáforo de la misión │ 💾 │ ?  │
├────────┬───────────────────────────────────────────────────┬─────────────────┤
│ Elegir │ [Juego][Tiles MZ][Terreno][Cuadrícula][−][+]       │                 │
│ Enemigo│                                                   │   Inspector:    │
│ Aliado │                 TU MAPA                           │   lo que has    │
│ Cofre  │                                                   │   elegido y sus │
│ ...    │                                                   │   opciones      │
│ Terreno│                                                   │                 │
│ Borrar │                                                   │                 │
├────────┴───────────────────────────────────────────────────┴─────────────────┤
│ Casilla 12, 7 · 18 Peak · coste 3      pista de la herramienta    🔍 75%  📁 │
└──────────────────────────────────────────────────────────────────────────────┘
```

| Zona | Para qué |
|---|---|
| **Barra superior** | Cambiar de mapa, abrir la configuración de la misión, deshacer/rehacer, ver si la misión está lista y guardar. |
| **Paleta** (izquierda) | La herramienta activa. Cada una tiene su número de atajo. |
| **Mapa** (centro) | Tu mapa de verdad, con lo que has colocado encima. Al pasar el ratón ves qué hay en cada casilla. |
| **Inspector** (derecha) | Las opciones de lo que tienes elegido, o una mini guía si no hay nada elegido. |
| **Barra inferior** | Casilla bajo el ratón, su terreno y su coste de movimiento, y qué hace la herramienta. |

### Qué significan los dibujos del mapa

| Dibujo | Significa |
|---|---|
| Sprite con base **roja** | Enemigo |
| Sprite con base **azul** | Aliado |
| Sprite con base **verde** | Independiente (por ejemplo, alguien que se puede reclutar) |
| Número abajo a la derecha | Nivel |
| **♛** rojo / azul | Jefe / líder |
| **⏱T3** | Refuerzo: llega en el turno 3 (`T3↻2` = turno 3 y cada 2; `S5` = al activar el interruptor 5) |
| **plantilla** | Unidad clásica marcada como plantilla de refuerzo |
| **💬** | Se puede reclutar hablando |
| 🧰 🚪 🏠 🏪 | Cofre, Puerta, Aldea (casa de tejado rojo), Tienda (tejado azul con moneda). Si el evento tiene su propio gráfico en MZ (por ejemplo `!Chest`), se dibuja ese |
| 🚩 bandera roja | Casilla de conquista |
| Casilla celeste con borde de rayas y 🏳 azul | Casilla de despliegue |
| Cuadro de rayas blancas | Un evento normal de MZ (un NPC, por ejemplo). Astra no lo toca. |

Si eliges una unidad, verás su **alcance**: en **azul** dónde puede moverse y en **rojo** dónde puede atacar (en **verde** si lleva bastón). Se calcula con el motor real del juego, teniendo en cuenta su clase, su arma y el terreno.

---

## 4. Herramientas

| Tecla | Herramienta | Qué hace al hacer clic en el mapa |
|---|---|---|
| `1` | **Elegir** ↖ | Elige lo que hay en la casilla. Arrástralo para moverlo. |
| `2` | **Enemigo** | Coloca un ★ Enemigo. |
| `3` | **Aliado** | Coloca un ★ Aliado. El primero se marca como líder automáticamente. |
| `4` | **Cofre** | Coloca un ★ Cofre (se abre con llave o con Cerrajería). |
| `5` | **Puerta** | Coloca una ★ Puerta. |
| `6` | **Aldea** | Coloca una ★ Aldea que se puede visitar. |
| `7` | **Tienda** | Coloca una ★ Tienda. |
| `8` | **Conquista** | Marca una casilla de conquista (victoria *Conquistar*). |
| `9` | **Despliegue** | Marca una casilla donde el jugador puede colocar a sus personajes antes de la batalla. |
| `0` | **Terreno** ▦ | Pinta el terreno táctico (ver [§7](#7-pintar-terreno)). |
| — | **Borrar** ✕ | Borra lo que hay en la casilla. Solo borra lo de TacticsMZ, nunca tus eventos normales. |

Si haces clic con una herramienta de colocar sobre algo que ya existe, Astra **lo elige** en vez de poner otra cosa encima. El **clic derecho** vuelve siempre a *Elegir*.

---

## 5. Editar lo que has colocado

Haz clic en algo con la herramienta *Elegir* (o con cualquier otra). El inspector muestra:

- **Una ficha** con su sprite, su nombre y, si es una unidad, sus **estadísticas reales** (barras de PV, Fue, Mag…), su clase, su nivel y su arma.
- **Botones extra para unidades:**
  - **+ Refuerzo**: la unidad no está al principio y llega en el turno que digas. Puedes hacer que se repita cada N turnos o que llegue al activar un interruptor.
  - **+ Reclutable**: el líder puede hablar con ella para que se una a tu ejército.
- **🗑 Borrar** y **⧉ Duplicar**. Con *Duplicar*, después haces clic en la casilla donde quieres la copia.
- **Las opciones de cada comando**, en español y con desplegables de tu base de datos (clases, armas, personajes, interruptores…).

Los cambios se aplican **al momento**. Si te equivocas, `Ctrl+Z`.

### Mover

Con *Elegir*, **arrastra** la unidad u objeto a otra casilla. Si la casilla ya está ocupada, Astra no la mueve.

### Unidades y comandos clásicos

Si tu mapa ya tenía comandos clásicos (Colocar unidad, Configurar interacción…), Astra los reconoce, los dibuja y te deja editarlos también, con todos sus campos.

---

## 6. La misión y el semáforo

**⚑ Misión** abre la configuración de la misión del mapa: título, condición de victoria, oro inicial, límite de turnos, mapa siguiente… Si el mapa no la tenía, Astra la crea.

> No es obligatoria: sin ella, la victoria es *Eliminar enemigos* (o *Conquistar* si has puesto alguna casilla de conquista).

El **semáforo** de arriba compila la misión con el motor real cada vez que cambias algo:

| Color | Significa |
|---|---|
| 🟢 | La misión funciona. Muestra la victoria y cuántos aliados, enemigos y refuerzos hay. |
| 🟡 | Funciona, pero hay algo raro: victoria *Derrotar jefes* sin ningún jefe, *Conquistar* sin casilla de conquista, varios aliados sin líder… |
| 🔴 | El juego daría un error al abrir este mapa. El texto dice cuál (por ejemplo, *"el enemigo necesita una clase o una plantilla"*). |

Haz clic en el semáforo para ver el resumen completo.

---

## 7. Pintar terreno

En TacticsMZ, **el terreno táctico es la región de MZ** de cada casilla: decide el coste de movimiento, la defensa y la evasión. El dibujo del tile no cuenta: una montaña dibujada sobre terreno *Llanura* se pisa como llanura.

1. Pulsa **Terreno** (`0`). Se activa la vista de terreno y cada casilla muestra su color y su número.
2. A la derecha, elige un terreno de la lista (nombre, coste, defensa y evasión).
3. Haz clic o **arrastra** sobre el mapa para pintar.

La lista de terrenos sale del paquete de gráficos de tu proyecto (`TacticsGraphics.json`), o de la tabla de ejemplo si no tienes paquete. Los terrenos intransitables se ven oscuros.

---

## 8. Vistas y zoom

| Botón | Qué muestra |
|---|---|
| **Juego** | La imagen del mapa del paquete de gráficos, la misma que verás en la batalla. Solo aparece si el mapa tiene una. |
| **Tiles MZ** | El mapa dibujado con los tiles del editor de MZ (capas, autotiles y sombras). |
| **Terreno** (`T`) | El color y el número de terreno de cada casilla, encima de lo anterior. |
| **Cuadrícula** (`G`) | Las líneas de las casillas. |
| **− / +** | Zoom. También con `Ctrl` + rueda del ratón. |

Para desplazarte por mapas grandes usa las barras de desplazamiento, la rueda del ratón o **arrastra con el botón central**.

---

## 9. Guardar y probar en MZ

**💾 Guardar** (`Ctrl+S`) escribe el mapa en `data/MapXXX.json` de tu proyecto. Mientras hay cambios sin guardar, el botón está dorado con un punto **●**.

### ⚠ La regla de oro

RPG Maker MZ guarda en memoria su propia copia del proyecto. Si MZ está abierto mientras guardas desde Astra y después guardas o pruebas en MZ, **MZ escribirá su copia antigua encima** y perderás lo hecho en Astra.

- **Lo más fácil:** cierra MZ mientras usas Astra y ábrelo cuando quieras probar.
- **Si MZ estaba abierto:** después de guardar en Astra, en MZ ve a *Archivo → Abrir proyecto* y vuelve a abrirlo **sin guardar**.

### Copias de seguridad

La primera vez que guardas un archivo en cada sesión, Astra hace una copia con el nombre `MapXXX.json.astra-bak` (y `plugins.js.astra-bak` si actualiza los plugins). Para volver atrás, borra `MapXXX.json` y renombra la copia quitándole `.astra-bak`.

Si intentas cerrar la pestaña o cambiar de mapa con cambios sin guardar, Astra te avisa.

---

## 10. Actualizar los plugins desde Astra

Los objetos ★ necesitan **TacticsMZ 0.3**. Si tu proyecto tiene la 0.2 (los 9 plugins) o no tiene TacticsMZ, verás un aviso amarillo con el botón **Actualizar**. Al aceptar, Astra:

1. Copia `TacticsEngine.js`, `TacticsUI.js` y `TacticsMZ.js` a `js/plugins/`.
2. Quita de `js/plugins.js` los 8 plugins antiguos y deja los 3 nuevos en el orden correcto.
3. **Conserva tus parámetros** de TacticsMZ (por ejemplo, el paquete de gráficos).
4. Guarda una copia de seguridad: `js/plugins.js.astra-bak`.

Los archivos antiguos (`TacticsSystem.js`, etc.) se quedan en la carpeta pero ya no se cargan. Puedes borrarlos cuando quieras.

> Hazlo con MZ cerrado, por la misma razón que en [§9](#9-guardar-y-probar-en-mz).

---

## 11. Plantillas de enemigo

Las plantillas te permiten definir un tipo de enemigo una vez (por ejemplo, *Bandido: Bárbaro nivel 4 con hacha*) y usarlo por nombre.

- Se crean en **📚 Base de datos → Enemigos rápidos** (o en MZ: *Administrador de plugins → TacticsMZ → Plantillas de enemigo*; es el mismo dato).
- En Astra, el campo **Plantilla** de un enemigo te sugiere las que existen mientras escribes.
- Lo que pongas en el propio enemigo (nivel, arma…) manda sobre la plantilla.

---

## 12. Base de datos

El botón **📚 Base de datos** (arriba) abre una ventana con una pestaña por cada cosa del juego. A la izquierda eliges qué editar; en el centro, la lista (con buscador, **＋ Nuevo** y **⧉ Duplicar**); a la derecha, la ficha.

| Pestaña | Qué editas | Dónde se guarda |
|---|---|---|
| 🧑 Personajes | Nombre, clase, nivel, perfil, variante, color, frase al caer, estadísticas y crecimientos propios (vacío = los de la clase), inventario y habilidades | `data/Actors.json` |
| 🛡 Clases | Tipo de movimiento, niveles, estadísticas, crecimientos, bono al promocionar, armas que usa y rango, **animación de batalla por arma**, **sprite de mapa**, promociones, habilidades y las que aprende por nivel, inventario de los enemigos de esa clase | `data/Classes.json` |
| ⚔ Armas | Tipo, poder, golpe, crítico, peso, usos, alcance, rango, golpes, mágica, eficaz contra, bastón, hechizo, estado que causa | `data/Weapons.json` |
| 🧪 Objetos | Qué hace (curar, llave, promocionar, subir estadística…), potencia, usos, precio, accesorio | `data/Items.json` |
| ✨ Habilidades / ☠ Estados | Lista de efectos (robar, drenar, veneno, +stat…) con su probabilidad o valor | `data/Skills.json`, `data/States.json` |
| 🌲 Terrenos | Nombre, color, coste, defensa, evasión, curación y coste por tipo de movimiento. **＋ Nuevo** usa la siguiente región libre | paquete de gráficos |
| 🥾 Tabla de movimiento | Todos los terrenos contra todos los tipos de movimiento en una sola tabla (como en Lex Talionis). Rojo = no puede pasar | paquete de gráficos |
| 🎨 Colores de equipo | El color que sustituye a cada color original para Jugador, Enemigo, Otro… con vista previa | paquete de gráficos |
| 👾 Enemigos rápidos | Las plantillas de ★ Enemigo | `js/plugins.js` |
| 🎞 Animaciones | Todas las animaciones de batalla, con reproductor (normal, crítico, fallo, cámara lenta) y qué clases las usan | paquete de gráficos |

**Cómo se guarda.** Igual que el mapa: botón **💾 Guardar** de la ventana (o `Ctrl+S`), con copia `.astra-bak` la primera vez y la misma regla de oro (cierra MZ o vuelve a abrir el proyecto después). Los datos tácticos se escriben en la **Nota** de F9 como bloque `<Tactics>{…}</Tactics>`; si ya tenías texto u otras etiquetas en la nota, se conservan. Lo que tenías con etiquetas cortas (`<Mov: 7>`) se pasa al bloque sin cambiar su valor.

**Paquete de gráficos.** Terrenos, colores, sprites y animaciones viven en el paquete de gráficos (`data/TacticsGraphics.json` en tu proyecto). Si un proyecto no tiene, Astra crea `data/AstraGraphics.json` y lo pone en el parámetro *Paquete de gráficos* de TacticsMZ.

**IDs.** RPG Maker necesita IDs seguidos, así que *Nuevo* siempre añade al final. Para "borrar", reutiliza la fila: cámbiale el nombre y los datos.

---

## 13. Animaciones de batalla y sprites (FE Essentials)

En **📚 Base de datos → 🎞 Animaciones → 📤 Importar animación** puedes traer animaciones de tres formas (o arrastrarlas a la ventana):

1. **Paquete de FE Essentials / FE Repo / FEBuilder** ([feessentials.com](https://feessentials.com/)). Elige el **.zip** tal cual lo descargas, la **carpeta** descomprimida o el **script .txt junto con sus PNG**. Astra lee el script (`/// - Mode 1`, `3 p- frame.png`, `C1A`…), así que **el orden, la duración y el momento del golpe ya vienen hechos**:
   - Modo 1 → *Normal*, modo 3 → *Crítico*, modo 12 → *Fallo*.
   - Si trae ataque a distancia (modos 5 y 6), crea también `Nombre-distancia` y lo asigna para cuando ataca de lejos.
   - El color de fondo de cada fotograma se vuelve transparente. Los fotogramas "perforantes" (dos mitades) se combinan.
   - `C01` después del golpe (en GBA, la espera mientras baja la vida) se convierte en una pausa de 20/60 s.
2. **Hoja de sprites PNG** en rejilla (como las de `img/feh/Animations` de tu proyecto, celdas de 192×192). Astra adivina el tamaño de celda, ignora las celdas vacías y tú haces clic en los fotogramas en el orden que quieras.
3. Cualquier mezcla: después de cargar puedes quitar, añadir o reordenar fotogramas, cambiar la duración de cada uno (en 1/60 s) y mover el golpe ⚡.

**Revisa los pies.** La vista previa dibuja la animación exactamente como la batalla de TacticsMZ, sobre su plataforma y al lado de un rival de referencia. Si flota o se hunde, cambia **Pies Y** (la línea roja de la hoja marca dónde están). **Escala** agranda o encoge animaciones de otro tamaño.

**Asígnala.** En la misma ventana elige *Clase* y *Con arma*, o hazlo después en **Clases → Armas y animaciones de batalla** (con ▶ para verla). Al guardar, Astra crea un atlas recortado en `img/astra/battle/Nombre.png` y las pistas `Nombre:normal`, `Nombre:critical` y `Nombre:miss` en el paquete de gráficos.

**Sprites de mapa.** En **Clases → Sprite de mapa → 📤 Subir sprite** eliges el PNG del sprite de mapa:
- Formato GBA / FE Essentials (tira vertical de 3 fotogramas de 16×16 o 32×32): Astra lo convierte al formato de TacticsMZ.
- Rejillas de 3 columnas como las de tu proyecto (`MapMyrmidonM.png`, 192×144): se usan tal cual.

Se guarda en `img/astra/map/` y se asigna a la clase. La vista previa lo muestra con los colores de cada equipo. Los sprites con la paleta GBA estándar se recolorean solos (rojo para enemigos, verde para otros).

> Los recursos de FE Essentials son F2U (gratis para juegos fan, **sin uso comercial**) y piden crédito a sus autores. Copia los créditos desde la página de cada recurso.

---

## 14. Atajos de teclado

| Atajo | Acción |
|---|---|
| `1` … `0` | Cambiar de herramienta |
| `Ctrl+Z` / `Ctrl+Y` (o `Ctrl+Shift+Z`) | Deshacer / rehacer (hasta 150 pasos) |
| `Ctrl+S` | Guardar (en la base de datos, guarda la base de datos) |
| `Esc` en la base de datos | Volver al mapa |
| `Supr` / `Retroceso` | Borrar lo elegido |
| `Esc` | Soltar la selección (o salir de un campo de texto) |
| `T` | Ver u ocultar el terreno |
| `G` | Ver u ocultar la cuadrícula |
| `+` / `−`, `Ctrl` + rueda | Zoom |
| Clic derecho | Volver a *Elegir* |
| Botón central + arrastrar | Desplazar el mapa |

---

## 15. Problemas frecuentes

**"Este navegador no permite abrir carpetas."**
Usa Google Chrome o Microsoft Edge.

**"Esta carpeta no parece un proyecto de RPG Maker MZ."**
Elegiste una carpeta de más arriba o de más abajo. Tiene que ser la que contiene `game.rmmzproject` y la carpeta `data`.

**Guardé en Astra pero en MZ no veo los cambios.**
MZ tiene el proyecto en memoria. Vuelve a abrirlo (*Archivo → Abrir proyecto*) sin guardar. Lee [§9](#9-guardar-y-probar-en-mz).

**Los autotiles (agua, hierba…) se ven de un color plano.**
Falta `js/rmmz_core.js` en el proyecto. Astra lee de ahí las reglas de los autotiles.

**Mis unidades se ven como círculos con letras en vez de sprites.**
La clase no tiene sprite de mapa. Ponle uno en **📚 Base de datos → Clases → Sprite de mapa** (o súbelo). Los aliados con gráfico de personaje en F9 usan ese gráfico.

**Importé una animación de FE y dice que no encuentra el script.**
El .zip o la carpeta tiene que incluir el `.txt` con las líneas `/// - Mode 1` y `3 p- frame.png`. Si solo tienes los PNG sueltos o un GIF, usa *Hoja de sprites* (o junta los PNG en una hoja).

**El semáforo está en rojo.**
Haz clic en él: el mensaje dice exactamente qué falla y es el mismo error que daría el juego.

**No me deja guardar ("NotAllowedError").**
Chrome perdió el permiso de la carpeta. Recarga la página y usa *↻ Reabrir*: te volverá a preguntar.

---

## 16. Para desarrolladores

### Archivos

```
src/editor/01_Model.js   Modelo: leer/escribir eventos ★ en el JSON de un mapa. Sin DOM: se prueba en Node.
src/editor/02_Database.js Base de datos: notas F9, filas nuevas de MZ, plantillas, scripts de FE, atlas y pistas.
src/app/project.js       Acceso al proyecto (carpeta o HTTP), plugins.js, paquete de gráficos, copias de seguridad.
src/app/tilemap.js       Dibujo del mapa con las reglas de Tilemap de MZ (las tablas se leen de rmmz_core.js).
src/app/icons.js         Iconos pixel-art propios, IconSet, iconos del paquete, sprites recoloreados y retratos.
src/app/app.js           Interfaz: paleta, mapa, inspector, historial, teclado.
src/app/anim.js          Reproductor de animaciones, importador (hoja PNG / FE Essentials / .zip) y sprites de mapa.
src/app/database.js      Ventana Base de datos.
src/app/style.css        Estilos.
src/app/shell.html       Plantilla. tools/build.js mete dentro el motor, el modelo, la app y los 3 plugins.
dist/AstraEditor.html    Resultado: un único archivo.
```

### Ideas clave

- **Astra no inventa formato.** Escribe comandos `357` (comando de plugin) de `TacticsMZ` con sus líneas `657`, igual que el editor de MZ. Por eso lo que hace Astra se puede abrir y editar en MZ, y al revés.
- **El motor del juego viene dentro.** El semáforo usa `Tactics.compileMap` y el alcance usa `Engine.paths`, así que lo que ves en Astra es lo que hará el juego.
- **Sin copiar RPG Maker.** Las tablas de autotiles se leen en tiempo de ejecución del `rmmz_core.js` de cada proyecto; el repositorio no incluye código ni imágenes de RPG Maker.
- **API del modelo** (`Tactics.Editor`): `create(map, herramienta, x, y, args)`, `setCommand(evento, id, args, después)`, `removeCommand`, `move`, `remove`, `eventAt`, `commands`, `kind`, `markers`, `missionEvent`, `check`.

### Compilar y probar

```bash
node tools/build.js     # genera dist/, incluido AstraEditor.html
npm test                # pruebas del motor y del modelo del editor
```

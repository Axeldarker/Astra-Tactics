# Astra Tactics

**TacticsMZ** (plugins) + **Astra Editor** (editor visual).

Plugins de **RPG Maker MZ** para crear juegos tácticos por turnos (estilo *Fire Emblem*) usando solo comandos de evento.

## Instalación

1. Copia los 3 archivos de [`dist/`](dist) a `js/plugins/` de tu proyecto.
2. Actívalos en este orden en el Administrador de plugins:
   1. `TacticsEngine`: el motor (reglas, IA, comandos, notas de F9)
   2. `TacticsUI`: la interfaz
   3. `TacticsMZ`: los comandos de evento y la unión con MZ

¿Vienes de la v0.2 (9 plugins)? Lee la sección 0 de [docs/ANTES_Y_DESPUES.md](docs/ANTES_Y_DESPUES.md).

## Astra Editor ✦

**`dist/AstraEditor.html`** es un editor visual de misiones: doble clic, se abre en Chrome o Edge, eliges la carpeta de tu proyecto MZ y colocas enemigos, aliados, cofres, aldeas, refuerzos y terreno **con un clic sobre tu mapa real**. Ves el alcance de cada unidad y un semáforo te dice si la misión funciona. No hay que instalar nada.

También trae una **📚 Base de datos** estilo Lex Talionis (clases, personajes, armas, objetos, terrenos, tabla de movimiento, colores de equipo…) y un **importador de animaciones de batalla** que lee directamente los paquetes de [FE Essentials](https://feessentials.com/) / FEBuilder (.zip o carpeta) y hojas PNG.

Guía completa: **[docs/ASTRA_EDITOR.md](docs/ASTRA_EDITOR.md)**.

## Tu primera misión en 3 pasos (desde MZ, sin Astra)

1. **Evento A** → `★ Aliado`: elige el personaje y marca *Es el líder*.
2. **Eventos B, C, D…** → `★ Enemigo`: elige clase y nivel.
3. En un mapa normal, un evento con `Abrir misión` que apunte al mapa de la batalla.

No hace falta *Configurar misión*: si no lo pones, la victoria es *Eliminar enemigos* (o *Conquistar* si hay una *Casilla de conquista*).

## Comandos rápidos (★)

| Comando | Para qué | Campos clave |
|---|---|---|
| ★ Enemigo | Un enemigo en la casilla del evento | Clase, Nivel, Rol (o una Plantilla) |
| ★ Aliado | Un personaje de F9 | Personaje, Es el líder |
| ★ Refuerzo | Debajo de un Enemigo/Aliado: llega más tarde | Turno, Repetir cada N, o Interruptor |
| ★ Cofre | Cofre con llave | Objeto o Arma, Oro |
| ★ Puerta | Puerta con llave | Ancho, Alto |
| ★ Aldea | Visita con regalo; los comandos de debajo se ejecutan | Texto, Regalo, Oro |
| ★ Tienda | Tienda | IDs de armas y objetos: `1,2,5` |
| ★ Reclutable | En un enemigo: el líder lo recluta hablando | Texto |

Las **plantillas de enemigo** se definen una vez en *Administrador de plugins → TacticsMZ → Plantillas de enemigo* y se usan por nombre en ★ Enemigo.

Todos los comandos clásicos (Colocar unidad, Configurar interacción, Cuándo ejecutar…) siguen disponibles para casos especiales.

## Notas de F9 sin JSON

```
<Tipo: volador>        <Mov: 7>          <Promociona: 7, 8>
<Alcance: 1-2>         <Golpe: 90>       <Efectivo: volador>
<Llave: cofre>         <Efecto: curar 20>
<Efecto: robar>        <Efecto: drenar 30>
```

La lista completa está en [docs/ANTES_Y_DESPUES.md §9](docs/ANTES_Y_DESPUES.md#9-base-de-datos-f9-notas-sin-json). El formato `<Tactics>{JSON}</Tactics>` sigue funcionando.

## Desarrollo

```
src/core   motor: System, Commands, Rules, Data, Notes, Easy
src/ui     interfaz: View, Graphics, Presentation, Scenes
src/mz     unión con MZ (Bridge.js) y texto de ayuda
tools/     build.js: genera dist/ y la cabecera de comandos a partir del catálogo
test/      pruebas en Node
```

```bash
node tools/build.js          # regenera dist/
npm test                     # pruebas (requiere Node 18+)
node tools/build.js --check  # falla si dist/ no está al día
```

Las anotaciones `@command/@arg` de `TacticsMZ.js` **se generan solas** desde `T.catalog`. Para añadir un comando usa `T.addCommand(...)` en `src/core` y vuelve a compilar.

## Licencia

MIT. Consulta [LICENSE](LICENSE).

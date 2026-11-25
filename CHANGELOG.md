# Cambios

## 0.3.0
- **Astra Editor** (`dist/AstraEditor.html`): editor visual de misiones en un solo archivo. Dibuja el mapa real (tiles de MZ o imagen del juego), coloca unidades e interacciones con un clic, pinta terreno, muestra el alcance, revisa la misión en vivo, deshace y rehace, guarda con copia de seguridad y actualiza los plugins del proyecto. Guía: docs/ASTRA_EDITOR.md.
- De 9 plugins a 3: TacticsEngine, TacticsUI y TacticsMZ, generados desde `src/` con `tools/build.js`.
- Comandos rápidos: ★ Enemigo, ★ Aliado, ★ Refuerzo, ★ Cofre, ★ Puerta, ★ Aldea, ★ Tienda y ★ Reclutable.
- Plantillas de enemigo en los parámetros de TacticsMZ.
- *Configurar misión* pasa a ser opcional.
- Notas de F9 sin JSON (etiquetas sueltas o bloque por líneas). El JSON sigue funcionando.
- Las anotaciones de comandos se generan desde el catálogo (antes había unas 2.100 líneas escritas a mano).
- Pruebas automáticas en Node, incluida la compatibilidad con la v0.2.0.
- Compatible con los mapas y las partidas guardadas de la v0.2.0.

## 0.2.0
- Versión original (rama `main`, carpeta `plugins/`).

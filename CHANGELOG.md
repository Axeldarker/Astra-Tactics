# Cambios

## 0.3.0
- **Interfaz nueva** en azul marino y oro: barra del capítulo con el resumen de la misión, paleta con iconos y atajos (Aliados `2`, Enemigos `3`), barra del mapa con vistas, interruptor de cuadrícula y zoom, panel derecho con pestañas *Unidades* / *Propiedades* y tarjeta de *Unidad seleccionada*, botón ▶ Probar misión y `Espacio` + arrastrar para mover el mapa.
- **Base de datos en Astra** (botón 📚): personajes, clases, armas, objetos, habilidades, estados, terrenos, tabla de movimiento, colores de equipo, enemigos rápidos y animaciones, con iconos, retratos y sprites. Guarda en F9 (nota `<Tactics>`), en el paquete de gráficos y en plugins.js.
- **Importador de animaciones de batalla**: paquetes de FE Essentials / FE Repo / FEBuilder (.zip, carpeta o script .txt + PNG, con orden, duraciones y golpe del script) y hojas PNG en rejilla. Vista previa igual que la batalla.
- **Sprites de mapa**: subir PNG (formato GBA de 3 fotogramas o rejilla) y asignarlo a una clase.
- Panel de unidades: tus personajes, plantillas y clases de F9 para colocar con clic o arrastrando al mapa.
- Reproductor de animaciones a escala fija, con los mismos lados que la batalla (atacante a la izquierda), rival de referencia elegible y botón ↔ Voltear (también al importar; los paquetes GBA llegan ya volteados).
- **Menú 📥 Importar**: arrastra cualquier archivo, .zip o carpeta (también sobre el editor) o pega un enlace de GitHub, .zip o .png. Astra detecta si es animación, sprite de mapa, retrato o icono y abre su importador.
- **🌐 Galería de FE Essentials** dentro de Astra: animaciones (con vista previa animada y armas), sprites de mapa, retratos e iconos del FE Repo, con buscador y un botón 📥 Importar en cada tarjeta. También desde cada menú de la base de datos, asignando lo importado a esa clase, personaje o arma. Los créditos se apuntan solos. Armas con iconos y botón 🔍 Similares (retratos y animaciones del mismo personaje).
- Importadores de **retratos** (96×80 o hoja GBA 128×112) y de **iconos de objeto** (16×16 o una hoja de iconos).
- Iconos pixel-art en el mapa y en la paleta: casas, tiendas, cofres, puertas, banderas. La paleta usa iconos grandes de 32×32 (caballero azul con escudo, soldado rojo con cuernos, cofre, puerta en arco, casa, puesto con toldo, bandera, estandarte, bloque de hierba y X).
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

/*:
 * @target MZ
 * @plugindesc v0.2.0 TacticsMZ: comandos para crear campañas tácticas.
 * @author TacticsMZ contributors
 * @url https://opensource.org/license/mit
 * @param ResourcePack
 * @text Paquete de gráficos externo (JSON)
 * @type string
 * @default
 * @help
 * Código MIT. Conserva LICENSE al redistribuir.
 * Orden: TacticsSystem, TacticsCommands, TacticsRules, TacticsView, TacticsGraphics, TacticsPresentation, TacticsScenes, TacticsData, TacticsMZ.
 * Crea eventos usando solamente los comandos de este plugin.
 * La configuración adicional de F9 utiliza bloques <Tactics> JSON </Tactics>.
 * Lee Manuales/01_Primera_mision.md y Manuales/02_Comandos.md.
 * Requiere una copia legítima de RPG Maker MZ para editar juegos MZ.
 *
 * @command Mission
 * @text Configurar misión
 * @desc Una configuración por mapa. Las unidades se colocan con comandos en sus eventos.
 * @arg title
 * @text Título
 * @type string
 * @default Nueva misión
 * @arg objective
 * @text Victoria
 * @type select
 * @option Eliminar enemigos
 * @value eliminate
 * @option Derrotar jefes
 * @value boss
 * @option Conquistar
 * @value seize
 * @option Sobrevivir
 * @value survive
 * @option Comando de finalizar
 * @value manual
 * @default eliminate
 * @arg leader
 * @text Unidad líder
 * @type number
 * @min -999999
 * @max 999999
 * @default 0
 * @arg protectedIds
 * @text Unidades protegidas (IDs separados por comas)
 * @type string
 * @default 
 * @arg surviveTurns
 * @text Turnos para sobrevivir
 * @type number
 * @min -999999
 * @max 999999
 * @default 5
 * @arg turnLimit
 * @text Límite de turnos (0 = sin límite)
 * @type number
 * @min -999999
 * @max 999999
 * @default 0
 * @arg gold
 * @text Oro inicial
 * @type number
 * @min -999999
 * @max 999999
 * @default 500
 * @arg fog
 * @text Visión (0 = sin niebla)
 * @type number
 * @min -999999
 * @max 999999
 * @default 0
 * @arg nextMapId
 * @text Mapa siguiente (0 = final)
 * @type number
 * @min -999999
 * @max 999999
 * @default 0
 * @arg creator
 * @text Crear protagonista al comenzar
 * @type boolean
 * @default false
 * @arg protagonist
 * @text Unidad protagonista
 * @type number
 * @min -999999
 * @max 999999
 * @default 1
 * @arg mode
 * @text Tipo de mapa
 * @type select
 * @option Batalla táctica
 * @value battle
 * @option Solo narrativa
 * @value story
 * @default battle
 * @arg mapGraphics
 * @text Gráfico del mapa
 * @type select
 * @option Imagen del paquete
 * @value resource
 * @option Tiles del editor MZ
 * @value native
 * @default resource
 * @arg showProgress
 * @text Mostrar EXP y ganancias de nivel
 * @type boolean
 * @default true
 *
 * @command Campaign
 * @text Configurar continuidad
 * @desc El progreso se guarda por partida. La preparación usa las casillas de despliegue de ESTE mapa.
 * @arg nextMapId
 * @text Mapa siguiente
 * @type number
 * @min -999999
 * @max 999999
 * @default 0
 * @arg deployment
 * @text Aliados al entrar
 * @type select
 * @option Preparación: elegir y colocar reclutas
 * @value prepare
 * @option Todos los reclutados: junto al líder
 * @value all
 * @option Solo los colocados: resto en reserva
 * @value placed
 * @default placed
 *
 * @command Deployment
 * @text Casilla de despliegue
 * @desc La posición de este evento será una casilla disponible en el mapa de preparación. Activa Preparación en Configurar continuidad.

 *
 * @command Unit
 * @text Colocar unidad
 * @desc Usa la posición del evento. Un aliado guardado conserva su progreso; nivel e inventario iniciales solo se aplican la primera vez.
 * @arg actorId
 * @text Personaje de F9 (0 = genérico)
 * @type actor
 * @default 0
 * @arg classId
 * @text Clase de F9 (0 = clase del personaje)
 * @type class
 * @default 0
 * @arg name
 * @text Nombre (vacío = BD)
 * @type string
 * @default 
 * @arg team
 * @text Equipo
 * @type select
 * @option Cualquiera
 * @value 0
 * @option Aliados
 * @value 1
 * @option Enemigos
 * @value 2
 * @option Independientes
 * @value 3
 * @default 1
 * @arg level
 * @text Nivel (0 = BD)
 * @type number
 * @min -999999
 * @max 999999
 * @default 0
 * @arg weaponId
 * @text Arma inicial (0 = BD)
 * @type weapon
 * @default 0
 * @arg itemId
 * @text Objeto inicial opcional
 * @type item
 * @default 0
 * @arg ai
 * @text Comportamiento
 * @type select
 * @option Avanzar y atacar
 * @value approach
 * @option Mantener posición
 * @value hold
 * @option Guardar posición
 * @value guard
 * @option Curar y apoyar
 * @value heal
 * @option Saquear
 * @value pillage
 * @option Buscar tesoros
 * @value thief
 * @option Patrullar
 * @value random
 * @option Buscar conversación
 * @value talk
 * @option Robar a una unidad
 * @value steal
 * @option Huir a destino
 * @value escape
 * @option Conquistar destino
 * @value seize
 * @default approach
 * @arg boss
 * @text Es jefe
 * @type boolean
 * @default false
 * @arg loot
 * @text Deja inventario al caer
 * @type boolean
 * @default false
 * @arg priority
 * @text Prioridad de IA
 * @type number
 * @min -999999
 * @max 999999
 * @default 0
 * @arg inventory
 * @text Inventario avanzado
 * @type struct<Equipment>[]
 * @default []
 * @arg stats
 * @text Estadísticas opcionales
 * @type struct<Statistic>[]
 * @default []
 * @arg ranks
 * @text Dominio inicial
 * @type struct<Rank>[]
 * @default []
 * @arg color
 * @text Color de vestimenta (#RRGGBB)
 * @type string
 * @default 
 * @arg onlyRecruited
 * @text Solo si ya fue reclutado
 * @type boolean
 * @default false
 * @arg variant
 * @text Variante gráfica
 * @type string
 * @default 
 * @arg buildProfile
 * @text Perfil de crecimiento de la clase
 * @type string
 * @default 
 * @arg preLevels
 * @text Niveles previos para estadísticas
 * @type number
 * @min -999999
 * @max 999999
 * @default 0
 * @arg constitution
 * @text Constitución (0 = BD)
 * @type number
 * @min -999999
 * @max 999999
 * @default 0
 * @arg group
 * @text Subgrupo
 * @type string
 * @default 
 * @arg affinity
 * @text Afinidad
 * @type string
 * @default 
 *
 * @command Template
 * @text Plantilla de refuerzo
 * @desc Añádelo a un evento con Colocar unidad. No aparece al inicio.

 *
 * @command Goal
 * @text Casilla de conquista
 * @desc La posición de este evento se convierte en un objetivo.

 *
 * @command Interaction
 * @text Configurar interacción
 * @desc Cofres y puertas consumen llaves o requieren la habilidad de abrir cerraduras.
 * @arg type
 * @text Tipo
 * @type select
 * @option Cofre
 * @value chest
 * @option Puerta
 * @value door
 * @option Tienda
 * @value shop
 * @option Casa
 * @value house
 * @option Poblado
 * @value village
 * @option Coliseo
 * @value arena
 * @default chest
 * @arg name
 * @text Nombre
 * @type string
 * @default 
 * @arg text
 * @text Diálogo
 * @type string
 * @default 
 * @arg repeat
 * @text Permitir repetir
 * @type boolean
 * @default false
 * @arg event
 * @text Evento a ejecutar
 * @type number
 * @min -999999
 * @max 999999
 * @default 0
 * @arg recruit
 * @text Unidad para reclutar
 * @type number
 * @min -999999
 * @max 999999
 * @default 0
 * @arg switchId
 * @text Activar interruptor
 * @type switch
 * @default 0
 * @arg rewardKind
 * @text Tipo de recompensa
 * @type select
 * @option Arma
 * @value weapon
 * @option Objeto
 * @value item
 * @default item
 * @arg rewardId
 * @text ID recompensa (0 = ninguna)
 * @type number
 * @min -999999
 * @max 999999
 * @default 0
 * @arg rewardGold
 * @text Oro de recompensa
 * @type number
 * @min -999999
 * @max 999999
 * @default 0
 * @arg stock
 * @text Mercancías
 * @type struct<Goods>[]
 * @default []
 * @arg secret
 * @text Requiere credencial
 * @type boolean
 * @default false
 * @arg group
 * @text Grupo de puertas
 * @type string
 * @default 
 * @arg terrain
 * @text Terreno después de abrir
 * @type number
 * @min -999999
 * @max 999999
 * @default 0
 * @arg width
 * @text Ancho de puerta
 * @type number
 * @min -999999
 * @max 999999
 * @default 1
 * @arg height
 * @text Alto de puerta
 * @type number
 * @min -999999
 * @max 999999
 * @default 1
 * @arg wager
 * @text Apuesta de coliseo
 * @type number
 * @min -999999
 * @max 999999
 * @default 100
 * @arg rounds
 * @text Rondas de coliseo
 * @type number
 * @min -999999
 * @max 999999
 * @default 3
 *
 * @command Conversation
 * @text Conversación de unidades
 * @desc Permite hablar junto a otra unidad y ejecutar un evento.
 * @arg first
 * @text Primera unidad
 * @type number
 * @min -999999
 * @max 999999
 * @default 0
 * @arg second
 * @text Segunda unidad
 * @type number
 * @min -999999
 * @max 999999
 * @default 0
 * @arg text
 * @text Texto
 * @type string
 * @default 
 * @arg event
 * @text Evento a ejecutar
 * @type number
 * @min -999999
 * @max 999999
 * @default 0
 * @arg once
 * @text Solo una vez
 * @type boolean
 * @default true
 * @arg recruit
 * @text Reclutar segunda unidad
 * @type boolean
 * @default false
 *
 * @command On
 * @text Cuándo ejecutar
 * @desc Añade acciones después. Las condiciones de página normales de MZ siguen activas.
 * @arg type
 * @text Momento
 * @type select
 * @option Inicio
 * @value start
 * @option Comienzo de fase
 * @value turnStart
 * @option Fin de fase
 * @value turnEnd
 * @option Unidad derrotada
 * @value unitDefeated
 * @option Entrar en casilla o región
 * @value enter
 * @option Interruptor activado
 * @value switch
 * @option Victoria
 * @value victory
 * @option Derrota
 * @value defeat
 * @option Llamada de otro evento
 * @value manual
 * @option Interacción
 * @value interaction
 * @default start
 * @arg team
 * @text Filtro de equipo
 * @type select
 * @option Cualquiera
 * @value 0
 * @option Aliados
 * @value 1
 * @option Enemigos
 * @value 2
 * @option Independientes
 * @value 3
 * @default 0
 * @arg turn
 * @text Turno (0 = cualquiera)
 * @type number
 * @min -999999
 * @max 999999
 * @default 0
 * @arg unit
 * @text Unidad (0 = cualquiera)
 * @type number
 * @min -999999
 * @max 999999
 * @default 0
 * @arg region
 * @text Región (0 = casilla del evento)
 * @type number
 * @min -999999
 * @max 999999
 * @default 0
 * @arg switchId
 * @text Interruptor
 * @type switch
 * @default 0
 * @arg once
 * @text Solo una vez
 * @type boolean
 * @default true
 * @arg skippable
 * @text Secuencia saltable con Mayús
 * @type boolean
 * @default false
 *
 * @command Start
 * @text Abrir misión
 * @desc Inicia el mapa táctico desde un evento normal de MZ. 0 utiliza el mapa actual.
 * @arg mapId
 * @text Mapa
 * @type number
 * @min -999999
 * @max 999999
 * @default 0
 *
 * @command Spawn
 * @text Crear refuerzo
 * @desc Busca una casilla válida cercana si la indicada está ocupada o fuera del mapa.
 * @arg template
 * @text Evento plantilla
 * @type number
 * @min -999999
 * @max 999999
 * @default 0
 * @arg id
 * @text ID nuevo (0 = automático)
 * @type number
 * @min -999999
 * @max 999999
 * @default 0
 * @arg x
 * @text Casilla X
 * @type number
 * @min -999999
 * @max 999999
 * @default 0
 * @arg y
 * @text Casilla Y
 * @type number
 * @min -999999
 * @max 999999
 * @default 0
 *
 * @command MoveSpawn
 * @text Mover último refuerzo
 * @desc Espera a que termine la animación.
 * @arg x
 * @text Casilla X
 * @type number
 * @min -999999
 * @max 999999
 * @default 0
 * @arg y
 * @text Casilla Y
 * @type number
 * @min -999999
 * @max 999999
 * @default 0
 *
 * @command MoveUnit
 * @text Mover unidad
 * @desc Movimiento de escena con ruta válida; no consume puntos de movimiento.
 * @arg unit
 * @text Unidad (ID del evento; 0 = activadora)
 * @type number
 * @min -999999
 * @max 999999
 * @default 0
 * @arg x
 * @text Casilla X
 * @type number
 * @min -999999
 * @max 999999
 * @default 0
 * @arg y
 * @text Casilla Y
 * @type number
 * @min -999999
 * @max 999999
 * @default 0
 *
 * @command ChangeUnit
 * @text Cambiar unidad
 * @desc Campos vacíos conservan el valor.
 * @arg unit
 * @text Unidad (ID del evento; 0 = activadora)
 * @type number
 * @min -999999
 * @max 999999
 * @default 0
 * @arg name
 * @text Nombre
 * @type string
 * @default 
 * @arg team
 * @text Equipo (0 = conservar)
 * @type select
 * @option Cualquiera
 * @value 0
 * @option Aliados
 * @value 1
 * @option Enemigos
 * @value 2
 * @option Independientes
 * @value 3
 * @default 0
 * @arg ai
 * @text Comportamiento (vacío = conservar)
 * @type select
 * @option Conservar
 * @value 
 * @option Avanzar y atacar
 * @value approach
 * @option Mantener posición
 * @value hold
 * @option Guardar posición
 * @value guard
 * @option Curar y apoyar
 * @value heal
 * @option Saquear
 * @value pillage
 * @option Buscar tesoros
 * @value thief
 * @option Patrullar
 * @value random
 * @option Buscar conversación
 * @value talk
 * @option Robar a una unidad
 * @value steal
 * @option Huir a destino
 * @value escape
 * @option Conquistar destino
 * @value seize
 * @default 
 * @arg boss
 * @text Jefe
 * @type select
 * @option Conservar
 * @value 
 * @option Sí
 * @value true
 * @option No
 * @value false
 * @default 
 * @arg refresh
 * @text Recuperar acción
 * @type boolean
 * @default false
 *
 * @command RemoveUnit
 * @text Retirar unidad
 * @desc Retirar un líder protegido también puede causar derrota.
 * @arg unit
 * @text Unidad (ID del evento; 0 = activadora)
 * @type number
 * @min -999999
 * @max 999999
 * @default 0
 * @arg defeated
 * @text Contar como derrota
 * @type boolean
 * @default true
 *
 * @command HP
 * @text Cambiar salud
 * @desc 0 PV derrota a la unidad. Este comando no resucita.
 * @arg unit
 * @text Unidad (ID del evento; 0 = activadora)
 * @type number
 * @min -999999
 * @max 999999
 * @default 0
 * @arg mode
 * @text Operación
 * @type select
 * @option Sumar
 * @value add
 * @option Fijar
 * @value set
 * @option Recuperar todos
 * @value full
 * @default add
 * @arg value
 * @text Cantidad
 * @type number
 * @min -999999
 * @max 999999
 * @default 0
 *
 * @command Stats
 * @text Cambiar estadística
 * @desc Modifica la estadística permanente.
 * @arg unit
 * @text Unidad (ID del evento; 0 = activadora)
 * @type number
 * @min -999999
 * @max 999999
 * @default 0
 * @arg stat
 * @text Estadística
 * @type select
 * @option health
 * @value health
 * @option power
 * @value power
 * @option magic
 * @value magic
 * @option skill
 * @value skill
 * @option speed
 * @value speed
 * @option luck
 * @value luck
 * @option defense
 * @value defense
 * @option resistance
 * @value resistance
 * @option move
 * @value move
 * @option build
 * @value build
 * @default health
 * @arg mode
 * @text Operación
 * @type select
 * @option Sumar
 * @value add
 * @option Fijar
 * @value set
 * @default add
 * @arg value
 * @text Cantidad
 * @type number
 * @min -999999
 * @max 999999
 * @default 0
 *
 * @command Experience
 * @text Dar experiencia
 * @desc Cada 100 EXP aplica los crecimientos y aprende las habilidades de nivel.
 * @arg unit
 * @text Unidad (ID del evento; 0 = activadora)
 * @type number
 * @min -999999
 * @max 999999
 * @default 0
 * @arg value
 * @text EXP
 * @type number
 * @min -999999
 * @max 999999
 * @default 25
 *
 * @command WeaponRank
 * @text Dominio de arma
 * @desc Respeta los límites de la clase.
 * @arg unit
 * @text Unidad (ID del evento; 0 = activadora)
 * @type number
 * @min -999999
 * @max 999999
 * @default 0
 * @arg category
 * @text Tipo
 * @type string
 * @default blade
 * @arg mode
 * @text Operación
 * @type select
 * @option Sumar
 * @value add
 * @option Fijar
 * @value set
 * @default add
 * @arg value
 * @text Cantidad
 * @type number
 * @min -999999
 * @max 999999
 * @default 10
 *
 * @command Support
 * @text Mejorar apoyo
 * @desc Requiere dos aliados a distancia máxima de 3 casillas.
 * @arg unit
 * @text Unidad (ID del evento; 0 = activadora)
 * @type number
 * @min -999999
 * @max 999999
 * @default 0
 * @arg target
 * @text Unidad objetivo (ID del evento)
 * @type number
 * @min -999999
 * @max 999999
 * @default 0
 *
 * @command Skill
 * @text Aprender o quitar habilidad
 * @desc La habilidad seleccionada debe definir efectos tácticos en su nota de F9.
 * @arg unit
 * @text Unidad (ID del evento; 0 = activadora)
 * @type number
 * @min -999999
 * @max 999999
 * @default 0
 * @arg skillId
 * @text Habilidad
 * @type skill
 * @default 0
 * @arg remove
 * @text Quitar
 * @type boolean
 * @default false
 *
 * @command State
 * @text Aplicar o quitar estado
 * @desc Los estados expiran al comenzar las fases de su unidad.
 * @arg unit
 * @text Unidad (ID del evento; 0 = activadora)
 * @type number
 * @min -999999
 * @max 999999
 * @default 0
 * @arg stateId
 * @text Estado
 * @type state
 * @default 0
 * @arg turns
 * @text Duración
 * @type number
 * @min -999999
 * @max 999999
 * @default 3
 * @arg remove
 * @text Quitar
 * @type boolean
 * @default false
 *
 * @command Promote
 * @text Promocionar
 * @desc Requiere una rama compatible de la clase.
 * @arg unit
 * @text Unidad (ID del evento; 0 = activadora)
 * @type number
 * @min -999999
 * @max 999999
 * @default 0
 * @arg classId
 * @text Clase destino
 * @type class
 * @default 0
 * @arg ignoreLevel
 * @text Ignorar requisito de nivel
 * @type boolean
 * @default false
 * @arg choose
 * @text Dejar elegir al jugador
 * @type boolean
 * @default false
 *
 * @command Inventory
 * @text Cambiar inventario
 * @desc Regalos sin espacio van al almacén; si está lleno quedan pendientes.
 * @arg unit
 * @text Unidad (ID del evento; 0 = activadora)
 * @type number
 * @min -999999
 * @max 999999
 * @default 0
 * @arg mode
 * @text Operación
 * @type select
 * @option Dar
 * @value give
 * @option Quitar
 * @value remove
 * @option Equipar
 * @value equip
 * @default give
 * @arg kind
 * @text Tipo
 * @type select
 * @option Arma
 * @value weapon
 * @option Objeto
 * @value item
 * @default weapon
 * @arg id
 * @text ID de F9
 * @type number
 * @min -999999
 * @max 999999
 * @default 1
 * @arg quantity
 * @text Cantidad
 * @type number
 * @min -999999
 * @max 999999
 * @default 1
 * @arg uses
 * @text Usos (-1 = BD)
 * @type number
 * @min -999999
 * @max 999999
 * @default -1
 *
 * @command Convoy
 * @text Cambiar almacén
 * @desc Depositar y retirar usan posiciones de inventario empezando por 1.
 * @arg unit
 * @text Unidad (ID del evento; 0 = activadora)
 * @type number
 * @min -999999
 * @max 999999
 * @default 0
 * @arg mode
 * @text Operación
 * @type select
 * @option Dar al almacén
 * @value give
 * @option Quitar del almacén
 * @value remove
 * @option Depositar de unidad
 * @value deposit
 * @option Retirar hacia unidad
 * @value withdraw
 * @default give
 * @arg kind
 * @text Tipo
 * @type select
 * @option Arma
 * @value weapon
 * @option Objeto
 * @value item
 * @default weapon
 * @arg id
 * @text ID
 * @type number
 * @min -999999
 * @max 999999
 * @default 1
 * @arg slot
 * @text Posición
 * @type number
 * @min -999999
 * @max 999999
 * @default 1
 *
 * @command Gold
 * @text Cambiar oro
 * @desc Una suma negativa descuenta oro; el mínimo es 0.
 * @arg mode
 * @text Operación
 * @type select
 * @option Sumar
 * @value add
 * @option Fijar
 * @value set
 * @default add
 * @arg value
 * @text Cantidad
 * @type number
 * @min -999999
 * @max 999999
 * @default 100
 *
 * @command Trade
 * @text Intercambiar objetos
 * @desc Requiere aliados adyacentes.
 * @arg unit
 * @text Unidad (ID del evento; 0 = activadora)
 * @type number
 * @min -999999
 * @max 999999
 * @default 0
 * @arg target
 * @text Unidad objetivo (ID del evento)
 * @type number
 * @min -999999
 * @max 999999
 * @default 0
 * @arg slot
 * @text Posición de unidad
 * @type number
 * @min -999999
 * @max 999999
 * @default 1
 * @arg targetSlot
 * @text Posición de objetivo (vacía = entregar)
 * @type number
 * @min -999999
 * @max 999999
 * @default 1
 *
 * @command Steal
 * @text Robar objeto
 * @desc Requiere habilidad, mayor velocidad y espacio.
 * @arg unit
 * @text Unidad (ID del evento; 0 = activadora)
 * @type number
 * @min -999999
 * @max 999999
 * @default 0
 * @arg target
 * @text Unidad objetivo (ID del evento)
 * @type number
 * @min -999999
 * @max 999999
 * @default 0
 * @arg slot
 * @text Posición del objetivo
 * @type number
 * @min -999999
 * @max 999999
 * @default 1
 *
 * @command UseItem
 * @text Usar objeto o bastón
 * @desc Respeta alcance y requisitos del efecto.
 * @arg unit
 * @text Unidad (ID del evento; 0 = activadora)
 * @type number
 * @min -999999
 * @max 999999
 * @default 0
 * @arg target
 * @text Unidad objetivo (ID del evento)
 * @type number
 * @min -999999
 * @max 999999
 * @default 0
 * @arg slot
 * @text Posición del objeto
 * @type number
 * @min -999999
 * @max 999999
 * @default 1
 * @arg x
 * @text Casilla X
 * @type number
 * @min -999999
 * @max 999999
 * @default 0
 * @arg y
 * @text Casilla Y
 * @type number
 * @min -999999
 * @max 999999
 * @default 0
 * @arg targetSlot
 * @text Arma a reparar (0 = primera dañada)
 * @type number
 * @min -999999
 * @max 999999
 * @default 0
 * @arg classId
 * @text Promoción elegida (0 = preguntar)
 * @type class
 * @default 0
 *
 * @command Combat
 * @text Resolver combate
 * @desc Aplica reglas, contraataques, usos, experiencia y presentación.
 * @arg unit
 * @text Unidad (ID del evento; 0 = activadora)
 * @type number
 * @min -999999
 * @max 999999
 * @default 0
 * @arg target
 * @text Unidad objetivo (ID del evento)
 * @type number
 * @min -999999
 * @max 999999
 * @default 0
 * @arg consumeAction
 * @text Consumir acción
 * @type boolean
 * @default true
 *
 * @command Rescue
 * @text Rescatar o soltar
 * @desc Rescate físico entre aliados cercanos.
 * @arg mode
 * @text Operación
 * @type select
 * @option Rescatar
 * @value rescue
 * @option Entregar
 * @value give
 * @option Tomar
 * @value take
 * @option Soltar
 * @value drop
 * @option Cubrir
 * @value cover
 * @default rescue
 * @arg unit
 * @text Unidad (ID del evento; 0 = activadora)
 * @type number
 * @min -999999
 * @max 999999
 * @default 0
 * @arg target
 * @text Unidad objetivo (ID del evento)
 * @type number
 * @min -999999
 * @max 999999
 * @default 0
 * @arg x
 * @text Casilla X
 * @type number
 * @min -999999
 * @max 999999
 * @default 0
 * @arg y
 * @text Casilla Y
 * @type number
 * @min -999999
 * @max 999999
 * @default 0
 *
 * @command Switch
 * @text Cambiar interruptor
 * @desc También activa disparadores de interruptor.
 * @arg id
 * @text Interruptor
 * @type switch
 * @default 0
 * @arg value
 * @text Valor
 * @type boolean
 * @default true
 *
 * @command SelfSwitch
 * @text Cambiar autointerruptor
 * @desc 0 significa este evento.
 * @arg event
 * @text Evento
 * @type number
 * @min -999999
 * @max 999999
 * @default 0
 * @arg letter
 * @text Letra
 * @type select
 * @option A
 * @value A
 * @option B
 * @value B
 * @option C
 * @value C
 * @option D
 * @value D
 * @default A
 * @arg value
 * @text Valor
 * @type boolean
 * @default true
 *
 * @command Variable
 * @text Cambiar variable
 * @desc Permite usar constante, turno u otra variable con desplazamiento.
 * @arg id
 * @text Variable
 * @type variable
 * @default 0
 * @arg mode
 * @text Operación
 * @type select
 * @option Fijar
 * @value set
 * @option Sumar
 * @value add
 * @option Restar
 * @value subtract
 * @default set
 * @arg source
 * @text Origen
 * @type select
 * @option Cantidad
 * @value constant
 * @option Turno actual
 * @value turn
 * @option Otra variable
 * @value variable
 * @default constant
 * @arg value
 * @text Cantidad o ID variable
 * @type number
 * @min -999999
 * @max 999999
 * @default 0
 * @arg offset
 * @text Desplazamiento
 * @type number
 * @min -999999
 * @max 999999
 * @default 0
 *
 * @command If
 * @text Si se cumple
 * @desc Debe cerrarse con Fin de condición. Se admite anidación.
 * @arg type
 * @text Condición
 * @type select
 * @option Interruptor
 * @value switch
 * @option Variable
 * @value variable
 * @option Unidad viva
 * @value alive
 * @option Turno
 * @value turn
 * @option Periodicidad
 * @value modulo
 * @option Unidad en área
 * @value area
 * @option Casilla libre
 * @value free
 * @option Interacción usada
 * @value interaction
 * @option Resultado
 * @value result
 * @option Autointerruptor
 * @value self
 * @default switch
 * @arg id
 * @text ID (unidad, interruptor, variable o interacción)
 * @type number
 * @min -999999
 * @max 999999
 * @default 0
 * @arg compare
 * @text Comparación
 * @type select
 * @option Igual
 * @value eq
 * @option Distinto
 * @value ne
 * @option Mayor o igual
 * @value gte
 * @option Menor o igual
 * @value lte
 * @default eq
 * @arg value
 * @text Valor
 * @type number
 * @min -999999
 * @max 999999
 * @default 1
 * @arg offset
 * @text Turno inicial / desplazamiento
 * @type number
 * @min -999999
 * @max 999999
 * @default 0
 * @arg x
 * @text Casilla X
 * @type number
 * @min -999999
 * @max 999999
 * @default 0
 * @arg y
 * @text Casilla Y
 * @type number
 * @min -999999
 * @max 999999
 * @default 0
 * @arg width
 * @text Ancho
 * @type number
 * @min -999999
 * @max 999999
 * @default 1
 * @arg height
 * @text Alto
 * @type number
 * @min -999999
 * @max 999999
 * @default 1
 * @arg text
 * @text Resultado o autointerruptor
 * @type string
 * @default victory
 * @arg negate
 * @text Invertir condición
 * @type boolean
 * @default false
 *
 * @command Else
 * @text Si no se cumple
 * @desc Rama alternativa del Si anterior.

 *
 * @command EndIf
 * @text Fin de condición
 * @desc Cierra la condición más reciente.

 *
 * @command RunEvent
 * @text Ejecutar otro evento
 * @desc Espera a que termine la secuencia llamada.
 * @arg event
 * @text Evento
 * @type number
 * @min -999999
 * @max 999999
 * @default 0
 *
 * @command Wait
 * @text Esperar
 * @desc La espera se conserva al guardar.
 * @arg frames
 * @text Fotogramas
 * @type number
 * @min -999999
 * @max 999999
 * @default 30
 *
 * @command EraseEvent
 * @text Desactivar evento
 * @desc No borra sus unidades. Impide nuevas activaciones.
 * @arg event
 * @text Evento (0 = este)
 * @type number
 * @min -999999
 * @max 999999
 * @default 0
 *
 * @command StopEvent
 * @text Terminar secuencia
 * @desc No ejecuta las acciones restantes de esta llamada.

 *
 * @command Dialogue
 * @text Mostrar diálogo
 * @desc Espera confirmación. Texto largo se pagina automáticamente.
 * @arg name
 * @text Nombre
 * @type string
 * @default 
 * @arg text
 * @text Texto
 * @type string
 * @default Bienvenidos.
 * @arg unit
 * @text Unidad (ID del evento; 0 = activadora)
 * @type number
 * @min -999999
 * @max 999999
 * @default 0
 * @arg speakerSlot
 * @text Retrato que habla (0 = unidad)
 * @type number
 * @min -999999
 * @max 999999
 * @default 0
 * @arg animate
 * @text Animar boca y ojos
 * @type boolean
 * @default true
 *
 * @command Camera
 * @text Enfocar cámara
 * @desc Centra la vista en la casilla.
 * @arg x
 * @text Casilla X
 * @type number
 * @min -999999
 * @max 999999
 * @default 0
 * @arg y
 * @text Casilla Y
 * @type number
 * @min -999999
 * @max 999999
 * @default 0
 * @arg frames
 * @text Duración del desplazamiento
 * @type number
 * @min -999999
 * @max 999999
 * @default 30
 *
 * @command Music
 * @text Música o sonido
 * @desc Selecciona un archivo del proyecto MZ.
 * @arg kind
 * @text Tipo
 * @type select
 * @option Música
 * @value bgm
 * @option Sonido
 * @value se
 * @option Detener música
 * @value stop
 * @default bgm
 * @arg name
 * @text Archivo
 * @type file
 * @dir audio/bgm/
 * @default 0
 * @arg volume
 * @text Volumen
 * @type number
 * @min -999999
 * @max 999999
 * @default 80
 * @arg pitch
 * @text Tono
 * @type number
 * @min -999999
 * @max 999999
 * @default 100
 *
 * @command Themes
 * @text Tema de combate
 * @desc Asigna música para el próximo combate.
 * @arg battle
 * @text Archivo BGM de combate
 * @type string
 * @default 
 * @arg victory
 * @text Archivo ME de victoria
 * @type string
 * @default 
 *
 * @command TeamName
 * @text Nombrar equipo
 * @desc Etiqueta mostrada en la HUD.
 * @arg team
 * @text Equipo
 * @type select
 * @option Cualquiera
 * @value 0
 * @option Aliados
 * @value 1
 * @option Enemigos
 * @value 2
 * @option Independientes
 * @value 3
 * @default 1
 * @arg name
 * @text Nombre
 * @type string
 * @default Aliados
 *
 * @command EscapePoint
 * @text Punto de retirada
 * @desc Una unidad indicada en esa casilla se retira cuando ejecuta este comando.
 * @arg unit
 * @text Unidad (ID del evento; 0 = activadora)
 * @type number
 * @min -999999
 * @max 999999
 * @default 0
 * @arg x
 * @text Casilla X
 * @type number
 * @min -999999
 * @max 999999
 * @default 0
 * @arg y
 * @text Casilla Y
 * @type number
 * @min -999999
 * @max 999999
 * @default 0
 *
 * @command PillageTarget
 * @text Objetivo de saqueo
 * @desc Cambia la IA a saquear y marca una interacción como objetivo preferido.
 * @arg unit
 * @text Unidad (ID del evento; 0 = activadora)
 * @type number
 * @min -999999
 * @max 999999
 * @default 0
 * @arg interaction
 * @text ID de interacción
 * @type number
 * @min -999999
 * @max 999999
 * @default 0
 *
 * @command Tone
 * @text Color del mapa
 * @desc Color hexadecimal y opacidad de 0 a 100. 0 quita el efecto.
 * @arg color
 * @text Color
 * @type string
 * @default #202b60
 * @arg opacity
 * @text Opacidad
 * @type number
 * @min -999999
 * @max 999999
 * @default 20
 *
 * @command Terrain
 * @text Cambiar terreno
 * @desc Actualiza movimiento, defensa y aspecto de un rectángulo.
 * @arg x
 * @text Casilla X
 * @type number
 * @min -999999
 * @max 999999
 * @default 0
 * @arg y
 * @text Casilla Y
 * @type number
 * @min -999999
 * @max 999999
 * @default 0
 * @arg width
 * @text Ancho
 * @type number
 * @min -999999
 * @max 999999
 * @default 1
 * @arg height
 * @text Alto
 * @type number
 * @min -999999
 * @max 999999
 * @default 1
 * @arg terrain
 * @text ID del terreno
 * @type number
 * @min -999999
 * @max 999999
 * @default 0
 *
 * @command Fog
 * @text Niebla de guerra
 * @desc Visión 0 revela todo el mapa.
 * @arg radius
 * @text Visión
 * @type number
 * @min -999999
 * @max 999999
 * @default 4
 *
 * @command Options
 * @text Cambiar reglas
 * @desc Solo se aceptan opciones conocidas.
 * @arg option
 * @text Opción
 * @type select
 * @option Diferencia para doble ataque
 * @value doubleSpeed
 * @option Multiplicador crítico
 * @value critical
 * @option Dos tiradas de precisión (0/1)
 * @value twoRolls
 * @option Crecimiento fijo (0/1)
 * @value fixedGrowth
 * @option Un solo rango máximo (0/1)
 * @value singleTopRank
 * @option Capacidad de inventario
 * @value inventory
 * @option Capacidad de almacén
 * @value convoy
 * @option Límite de apoyos
 * @value supportCap
 * @default doubleSpeed
 * @arg value
 * @text Valor
 * @type number
 * @min -999999
 * @max 999999
 * @default 4
 *
 * @command Objective
 * @text Cambiar objetivo
 * @desc Sustituye la victoria activa.
 * @arg objective
 * @text Objetivo
 * @type select
 * @option Eliminar enemigos
 * @value eliminate
 * @option Derrotar jefes
 * @value boss
 * @option Conquistar
 * @value seize
 * @option Sobrevivir
 * @value survive
 * @option Comando de finalizar
 * @value manual
 * @default eliminate
 * @arg leader
 * @text Unidad líder
 * @type number
 * @min -999999
 * @max 999999
 * @default 0
 * @arg turns
 * @text Turnos
 * @type number
 * @min -999999
 * @max 999999
 * @default 5
 *
 * @command Finish
 * @text Finalizar misión
 * @desc Las recompensas deben ponerse en un evento de victoria de una sola ejecución.
 * @arg result
 * @text Resultado
 * @type select
 * @option Victoria
 * @value victory
 * @option Derrota
 * @value defeat
 * @default victory
 *
 * @command Save
 * @text Guardar partida
 * @desc Guarda también la posición actual de la secuencia.
 * @arg slot
 * @text Ranura
 * @type number
 * @min -999999
 * @max 999999
 * @default 1
 *
 * @command NextMission
 * @text Continuar campaña
 * @desc 0 usa el mapa siguiente de la misión.
 * @arg mapId
 * @text Mapa
 * @type number
 * @min -999999
 * @max 999999
 * @default 0
 *
 * @command OpenMenu
 * @text Abrir pantalla
 * @desc Permite acceder a creador, galería, taller o almacén durante la misión.
 * @arg menu
 * @text Pantalla
 * @type select
 * @option Animaciones
 * @value animations
 * @option Crear protagonista
 * @value creator
 * @option Taller de clases
 * @value workshop
 * @option Almacén
 * @value convoy
 * @option Estado
 * @value status
 * @option Entregas pendientes
 * @value pending
 * @option Datos de ejércitos
 * @value groups
 * @option Elegir promoción
 * @value promotion
 * @option Editor de pistas
 * @value tracks
 * @option Editor de paletas RGB
 * @value palette
 * @default animations
 * @arg unit
 * @text Unidad (ID del evento; 0 = activadora)
 * @type number
 * @min -999999
 * @max 999999
 * @default 0
 *
 * @command Color
 * @text Cambiar colores RGB
 * @desc Colores hexadecimales #RRGGBB.
 * @arg unit
 * @text Unidad (ID del evento; 0 = activadora)
 * @type number
 * @min -999999
 * @max 999999
 * @default 0
 * @arg cloth
 * @text Vestimenta
 * @type string
 * @default #61adcf
 * @arg hair
 * @text Cabello
 * @type string
 * @default #392d35
 * @arg skin
 * @text Piel
 * @type string
 * @default #dfb797
 *
 * @command Bounds
 * @text Área jugable
 * @desc Limita movimiento y selección; conserva el tamaño del mapa del editor.
 * @arg x
 * @text Casilla X
 * @type number
 * @min -999999
 * @max 999999
 * @default 0
 * @arg y
 * @text Casilla Y
 * @type number
 * @min -999999
 * @max 999999
 * @default 0
 * @arg width
 * @text Ancho
 * @type number
 * @min -999999
 * @max 999999
 * @default 10
 * @arg height
 * @text Alto
 * @type number
 * @min -999999
 * @max 999999
 * @default 10
 *
 * @command Scene
 * @text Escena narrativa
 * @desc Iniciar o terminar una escena. Saltarla conserva cambios, recompensas y eventos.
 * @arg mode
 * @text Operación
 * @type select
 * @option Comenzar
 * @value begin
 * @option Terminar
 * @value end
 * @default begin
 * @arg background
 * @text Fondo (ruta en img/, vacío = mapa)
 * @type string
 * @default 
 * @arg skippable
 * @text Permitir saltar
 * @type boolean
 * @default true
 *
 * @command Portrait
 * @text Colocar retrato
 * @desc Usa unidad del mapa o personaje de F9. Hay seis posiciones persistentes.
 * @arg slot
 * @text Posición (1 a 6)
 * @type number
 * @min -999999
 * @max 999999
 * @default 1
 * @arg unit
 * @text Unidad (ID del evento; 0 = activadora)
 * @type number
 * @min -999999
 * @max 999999
 * @default 0
 * @arg actorId
 * @text Personaje de F9 (si no hay unidad)
 * @type actor
 * @default 0
 * @arg faceKey
 * @text Retrato del paquete (opcional)
 * @type string
 * @default 
 * @arg expression
 * @text Expresión
 * @type string
 * @default normal
 * @arg mirror
 * @text Girar
 * @type boolean
 * @default false
 * @arg frames
 * @text Entrada en fotogramas
 * @type number
 * @min -999999
 * @max 999999
 * @default 18
 *
 * @command PortraitAction
 * @text Dirigir retrato
 * @desc Mover, intercambiar, girar, hacer saltar, cambiar expresión o retirar.
 * @arg slot
 * @text Posición de origen
 * @type number
 * @min -999999
 * @max 999999
 * @default 1
 * @arg mode
 * @text Acción
 * @type select
 * @option Mover
 * @value move
 * @option Intercambiar
 * @value swap
 * @option Girar
 * @value flip
 * @option Saltar
 * @value jump
 * @option Cambiar expresión
 * @value expression
 * @option Retirar
 * @value remove
 * @default move
 * @arg targetSlot
 * @text Posición de destino
 * @type number
 * @min -999999
 * @max 999999
 * @default 4
 * @arg expression
 * @text Expresión
 * @type string
 * @default normal
 * @arg frames
 * @text Duración
 * @type number
 * @min -999999
 * @max 999999
 * @default 18
 *
 * @command Chapter
 * @text Presentar capítulo
 * @desc Muestra una tarjeta antes de continuar la secuencia.
 * @arg title
 * @text Título
 * @type string
 * @default Nuevo capítulo
 * @arg subtitle
 * @text Subtítulo
 * @type string
 * @default 
 * @arg frames
 * @text Duración mínima
 * @type number
 * @min -999999
 * @max 999999
 * @default 90
 *
 * @command AIPlan
 * @text Objetivo de inteligencia
 * @desc Conversar, robar, huir, defender o conquistar; una ruta puede enumerar IDs de interacciones y acabar en la casilla destino.
 * @arg unit
 * @text Unidad (ID del evento; 0 = activadora)
 * @type number
 * @min -999999
 * @max 999999
 * @default 0
 * @arg mode
 * @text Plan
 * @type select
 * @option Defender área
 * @value guard
 * @option Curar aliados
 * @value heal
 * @option Conversar
 * @value talk
 * @option Robar
 * @value steal
 * @option Huir
 * @value escape
 * @option Conquistar
 * @value seize
 * @option Tesoros y salida
 * @value thief
 * @option Atacar
 * @value approach
 * @default guard
 * @arg target
 * @text Unidad objetivo (0 = automática)
 * @type number
 * @min -999999
 * @max 999999
 * @default 0
 * @arg x
 * @text Casilla X
 * @type number
 * @min -999999
 * @max 999999
 * @default 0
 * @arg y
 * @text Casilla Y
 * @type number
 * @min -999999
 * @max 999999
 * @default 0
 * @arg radius
 * @text Radio de defensa
 * @type number
 * @min -999999
 * @max 999999
 * @default 3
 * @arg route
 * @text IDs de interacciones en orden
 * @type string
 * @default 
 * @arg event
 * @text Evento al completar (0 = ninguno)
 * @type number
 * @min -999999
 * @max 999999
 * @default 0
 *
 * @command Group
 * @text Asignar subgrupo
 * @desc Asigna un nombre interno del ejército. Consulta los conteos en Datos de ejércitos.
 * @arg unit
 * @text Unidad (ID del evento; 0 = activadora)
 * @type number
 * @min -999999
 * @max 999999
 * @default 0
 * @arg name
 * @text Subgrupo
 * @type string
 * @default Destacamento
 *
 * @command Alliance
 * @text Relación entre equipos
 * @desc Define si dos equipos son aliados. Afecta movimiento, combate y apoyos.
 * @arg first
 * @text Primer equipo
 * @type number
 * @min -999999
 * @max 999999
 * @default 1
 * @arg second
 * @text Segundo equipo
 * @type number
 * @min -999999
 * @max 999999
 * @default 3
 * @arg allied
 * @text Son aliados
 * @type boolean
 * @default true
 *
 * @command Pending
 * @text Gestionar entregas pendientes
 * @desc Retirar conserva usos y solo elimina la entrega si cabe. Posiciones desde 1.
 * @arg mode
 * @text Operación
 * @type select
 * @option Abrir ventana
 * @value open
 * @option Dar a unidad
 * @value unit
 * @option Enviar al almacén
 * @value convoy
 * @option Descartar
 * @value discard
 * @default open
 * @arg unit
 * @text Unidad (ID del evento; 0 = activadora)
 * @type number
 * @min -999999
 * @max 999999
 * @default 0
 * @arg slot
 * @text Posición
 * @type number
 * @min -999999
 * @max 999999
 * @default 1
 *
 * @command DropItem
 * @text Marcar botín individual
 * @desc Marca o desmarca un objeto concreto del inventario.
 * @arg unit
 * @text Unidad (ID del evento; 0 = activadora)
 * @type number
 * @min -999999
 * @max 999999
 * @default 0
 * @arg slot
 * @text Posición
 * @type number
 * @min -999999
 * @max 999999
 * @default 1
 * @arg drop
 * @text Dejar al caer
 * @type boolean
 * @default true
 *
 * @command Variant
 * @text Cambiar variante
 * @desc El nombre debe existir en variants de la clase. Vacío usa la apariencia principal.
 * @arg unit
 * @text Unidad (ID del evento; 0 = activadora)
 * @type number
 * @min -999999
 * @max 999999
 * @default 0
 * @arg variant
 * @text Variante
 * @type string
 * @default 
 *
 * @command Tile
 * @text Cambiar tile del editor
 * @desc Modifica una capa de un mapa nativo MZ. Los IDs de tile provienen del editor.
 * @arg x
 * @text Casilla X
 * @type number
 * @min -999999
 * @max 999999
 * @default 0
 * @arg y
 * @text Casilla Y
 * @type number
 * @min -999999
 * @max 999999
 * @default 0
 * @arg layer
 * @text Capa (0 a 3)
 * @type number
 * @min -999999
 * @max 999999
 * @default 0
 * @arg tileId
 * @text ID de tile
 * @type number
 * @min -999999
 * @max 999999
 * @default 0
 *
 * @command Affinity
 * @text Configurar afinidad
 * @desc Bonos por rango de apoyo; se suman las afinidades de ambos personajes.
 * @arg name
 * @text Afinidad
 * @type string
 * @default fuego
 * @arg attack
 * @text Ataque
 * @type number
 * @min -999999
 * @max 999999
 * @default 0
 * @arg defense
 * @text Defensa
 * @type number
 * @min -999999
 * @max 999999
 * @default 0
 * @arg hit
 * @text Acierto
 * @type number
 * @min -999999
 * @max 999999
 * @default 0
 * @arg avoid
 * @text Evasión
 * @type number
 * @min -999999
 * @max 999999
 * @default 0
 * @arg crit
 * @text Crítico
 * @type number
 * @min -999999
 * @max 999999
 * @default 0
 * @arg dodge
 * @text Evitar crítico
 * @type number
 * @min -999999
 * @max 999999
 * @default 0
 *
 * @command BattleTracks
 * @text Asignar pistas de combate
 * @desc Usa la secuencia guardada con el editor de pistas para una clase, arma y distancia.
 * @arg classId
 * @text Clase
 * @type class
 * @default 1
 * @arg category
 * @text Tipo de arma (vacío = cualquiera)
 * @type string
 * @default 
 * @arg distance
 * @text Distancia
 * @type select
 * @option Cualquiera
 * @value any
 * @option Adyacente
 * @value near
 * @option A distancia
 * @value far
 * @default any
 * @arg clip
 * @text Nombre de pista guardada
 * @type string
 * @default 
 */
/*~struct~Equipment:
 * @param kind
 * @text Tipo
 * @type select
 * @option Arma
 * @value weapon
 * @option Objeto
 * @value item
 * @default weapon
 * @param id
 * @text ID de la entrada en F9
 * @type number
 * @min -999999
 * @max 999999
 * @default 1
 * @param uses
 * @text Usos (-1 = BD)
 * @type number
 * @min -999999
 * @max 999999
 * @default -1
 * @param drop
 * @text Dejar este objeto al caer
 * @type boolean
 * @default false
 */
/*~struct~Statistic:
 * @param stat
 * @text Estadística
 * @type select
 * @option health
 * @value health
 * @option power
 * @value power
 * @option magic
 * @value magic
 * @option skill
 * @value skill
 * @option speed
 * @value speed
 * @option luck
 * @value luck
 * @option defense
 * @value defense
 * @option resistance
 * @value resistance
 * @option move
 * @value move
 * @option build
 * @value build
 * @default health
 * @param value
 * @text Valor
 * @type number
 * @min -999999
 * @max 999999
 * @default 0
 */
/*~struct~Rank:
 * @param category
 * @text Tipo de arma (blade, pole, axe, bow, arcane, staff o ID MZ)
 * @type string
 * @default blade
 * @param value
 * @text Experiencia de arma
 * @type number
 * @min -999999
 * @max 999999
 * @default 0
 */
/*~struct~Goods:
 * @param kind
 * @text Tipo
 * @type select
 * @option Arma
 * @value weapon
 * @option Objeto
 * @value item
 * @default weapon
 * @param id
 * @text ID de F9
 * @type number
 * @min -999999
 * @max 999999
 * @default 1
 * @param count
 * @text Existencias (-1 = infinitas)
 * @type number
 * @min -999999
 * @max 999999
 * @default -1
 * @param price
 * @text Precio (-1 = BD)
 * @type number
 * @min -999999
 * @max 999999
 * @default -1
 */
/* TacticsMZ | Copyright (c) 2026 TacticsMZ contributors | MIT License */
(function(root){
"use strict";
const T=root.Tactics;
function note(row){
 const match=String(row.note||"").match(/<Tactics>([\s\S]*?)<\/Tactics>/i);
 if(!match)return {};
 try{return JSON.parse(match[1]);}catch(error){throw new Error("F9: nota Tactics inválida en "+row.id+" · "+row.name+": "+error.message);}
}
T.readDatabase=function(data){
 const db={classes:{},actors:{},weapons:{},items:{},skills:{},states:{},terrain:T.copy(T.exampleDatabase?T.exampleDatabase.terrain:{0:{name:"Suelo",cost:1,color:"#667f60"}}),triangle:["blade","pole","axe"]};
 const rows=(name,fn)=>(data[name]||[]).filter(Boolean).forEach(row=>fn(row,note(row)));
 rows("classes",(c,n)=>{const param=i=>(c.params&&c.params[i]&&c.params[i][1])||0;const types=(c.traits||[]).filter(t=>t.code===51).map(t=>String(t.dataId));
  db.classes[c.id]=Object.assign({id:c.id,name:c.name,stats:{health:Math.max(1,param(0)),power:param(2),magic:param(4),skill:param(6),speed:param(6),luck:param(7),defense:param(3),resistance:param(5),move:5,build:6},growth:{health:60,power:35,magic:35,skill:40,speed:35,luck:30,defense:25,resistance:25},weaponTypes:types,ranks:Object.fromEntries(types.map(t=>[t,0])),skills:[],inventory:[],promotions:[],moveType:"foot",learn:(c.learnings||[]).map(l=>({level:l.level,skill:l.skillId}))},n);
 });
 rows("actors",(a,n)=>{db.actors[a.id]=Object.assign({id:a.id,name:a.name,profile:a.profile||"",classId:a.classId,level:a.initialLevel,face:a.faceName?"img/faces/"+a.faceName+".png":"",faceIndex:a.faceIndex||0,characterIndex:a.characterIndex||0,graphic:a.characterName,inventory:a.equips&&a.equips[0]?[{kind:"weapon",id:a.equips[0]}]:undefined},n);});
 rows("weapons",(w,n)=>db.weapons[w.id]=Object.assign({id:w.id,name:w.name,description:w.description||"",iconIndex:w.iconIndex||0,category:String(w.wtypeId),might:(w.params||[])[2]||0,hit:85,crit:0,weight:5,minRange:1,maxRange:1,uses:35,price:w.price,rank:0},n));
 rows("items",(i,n)=>{const effect=(i.effects||[]).find(e=>e.code===11);db.items[i.id]=Object.assign({id:i.id,name:i.name,description:i.description||"",iconIndex:i.iconIndex||0,effect:effect?"heal":"passive",power:effect?effect.value2:0,healPercent:effect?effect.value1:0,uses:i.consumable?1:0,price:i.price},n);});
 rows("skills",(s,n)=>db.skills[s.id]=Object.assign({id:s.id,name:s.name,description:s.description||"",iconIndex:s.iconIndex||0,effects:[]},n));
 rows("states",(s,n)=>db.states[s.id]=Object.assign({id:s.id,name:s.name,description:s.description||"",iconIndex:s.iconIndex||0,effects:[]},n));
 return db;
};
T.audioBridge=function(manager){return {
 battleStart:(p,name)=>{if(p.mapBgm===undefined)p.mapBgm=T.copy(manager.saveBgm());manager.playBgm({name,volume:80,pitch:100,pan:0});},
 battleEnd:p=>{if(p.mapBgm&&p.mapBgm.name)manager.replayBgm(p.mapBgm);else manager.stopBgm();},
 victory:name=>{if(name)manager.playMe({name,volume:85,pitch:100,pan:0});}
};};
if(typeof Scene_Base==="undefined")return;
const resourceName=String(PluginManager.parameters("TacticsMZ").ResourcePack||"");
if(resourceName){T.assert(/^[a-zA-Z0-9_/-]+$/.test(resourceName),"Nombre de paquete gráfico inválido");DataManager._databaseFiles.push({name:"$dataTacticsGraphics",src:resourceName+".json"});}
let active=null,pending=null,opening=false,resume=false;
const database=()=>{const db=T.readDatabase({classes:$dataClasses,actors:$dataActors,weapons:$dataWeapons,items:$dataItems,skills:$dataSkills,states:$dataStates});db.tilesets=T.copy(root.$dataTilesets||[]);if(root.$dataTacticsGraphics){db.graphics=T.copy(root.$dataTacticsGraphics);if(db.graphics.terrain)db.terrain=db.graphics.terrain;}return db;};
function synchronize(){
 if(!active)return;const s=active.s;$gameParty._gold=s.gold;
 Object.keys(s.flags).forEach(k=>$gameSwitches.setValue(Number(k),s.flags[k]));Object.keys(s.vars).forEach(k=>$gameVariables.setValue(Number(k),s.vars[k]));
 Object.keys(s.self).forEach(k=>{const a=k.split(":");$gameSelfSwitches.setValue([s.map.id,Number(a[0]),a[1]],s.self[k]);});
}
function loadMap(id){return new Promise((resolve,reject)=>{const xhr=new XMLHttpRequest();xhr.open("GET","data/Map"+String(id).padStart(3,"0")+".json");xhr.onload=()=>{try{if(xhr.status>=400)throw new Error("Mapa no encontrado: "+id);resolve(T.compileMap(JSON.parse(xhr.responseText),id));}catch(e){reject(e);}};xhr.onerror=()=>reject(new Error("No se pudo leer mapa "+id));xhr.send();});}
function open(id,continuation){
 if(opening)return;opening=true;
 loadMap(id).then(map=>{
  if(continuation&&active)active.nextMission(map);else{
   active=new T.Engine(database(),map);$gameSwitches._data.forEach((v,k)=>active.s.flags[k]=v);$gameVariables._data.forEach((v,k)=>active.s.vars[k]=v);
  }
  pending=active;opening=false;SceneManager.goto(Scene_Tactics);
 }).catch(error=>{opening=false;SceneManager.catchException(error);});
}
T.openMission=open;T.activeEngine=()=>active;
T.catalog.forEach(def=>PluginManager.registerCommand("TacticsMZ",def.id,function(args){
 const a=T.args(def.id,args);
 if(def.id==="Start"){open(a.mapId||$gameMap.mapId(),false);this.setWaitMode("tactics");}
 else if(active&&!def.definition)active.command(def.id,a,{event:this.eventId(),context:{},branches:[]});
}));
const interpreterWait=Game_Interpreter.prototype.updateWaitMode;
Game_Interpreter.prototype.updateWaitMode=function(){if(this._waitMode==="tactics"){if(opening||SceneManager._scene instanceof Scene_Tactics)return true;this._waitMode="";return false;}return interpreterWait.call(this);};
class Scene_Tactics extends Scene_Base {
 create(){
  super.create();active=pending||active;pending=null;T.assert(active,"No hay misión activa");
  this._canvas=document.createElement("canvas");this._canvas.width=Graphics.width;this._canvas.height=Graphics.height;
  this._bitmap=new Bitmap(Graphics.width,Graphics.height);this._sprite=new Sprite(this._bitmap);this.addChild(this._sprite);
  this._view=new T.View(this._canvas,active,{saveMenu:()=>{synchronize();SceneManager.push(Scene_Save);},save:(state,slot)=>{synchronize();DataManager.saveGame(slot).then(()=>active.notice("Partida guardada en ranura "+slot)).catch(e=>active.notice("No se pudo guardar: "+e.message));},next:id=>{if(id)open(id,true);else active.notice("Campaña terminada");},music:p=>{if(p.kind==="stop")AudioManager.stopBgm();else if(p.name)AudioManager[p.kind==="se"?"playSe":"playBgm"]({name:p.name,volume:p.volume,pitch:p.pitch,pan:0});}});
  Object.assign(this._view.hooks,T.audioBridge(AudioManager));
  this._view.hooks.animation=(id,x,y)=>{const data=$dataAnimations[id];if(!data)return;const target=new Sprite(new Bitmap(1,1));target.x=x;target.y=y;this.addChild(target);const sprite=data.frames?new Sprite_AnimationMV():new Sprite_Animation();sprite.setup([target],data,false,0);this.addChild(sprite);this._tacticalAnimations=this._tacticalAnimations||[];this._tacticalAnimations.push({sprite,target});};
  this._view.attach(Graphics.app.view);T.currentView=this._view;
 }
 update(){super.update();this._view.update();this._view.draw();this._bitmap.context.clearRect(0,0,Graphics.width,Graphics.height);this._bitmap.context.drawImage(this._canvas,0,0);this._bitmap.baseTexture.update();this._tacticalAnimations=(this._tacticalAnimations||[]).filter(a=>{if(a.sprite.isPlaying())return true;this.removeChild(a.sprite);this.removeChild(a.target);a.sprite.destroy();a.target.bitmap.destroy();a.target.destroy();return false;});}
 terminate(){super.terminate();synchronize();this._view.destroy();this._bitmap.destroy();}
}
T.Scene=Scene_Tactics;
const make=DataManager.makeSaveContents;
DataManager.makeSaveContents=function(){const contents=make.call(this);if(active)contents.tactics=active.save();return contents;};
const extract=DataManager.extractSaveContents;
DataManager.extractSaveContents=function(contents){extract.call(this,contents);active=contents.tactics?new T.Engine(database(),null,contents.tactics):null;resume=!!active;};
const setup=DataManager.setupNewGame;
DataManager.setupNewGame=function(){active=null;pending=null;resume=false;setup.call(this);};
const mapStart=Scene_Map.prototype.start;
Scene_Map.prototype.start=function(){mapStart.call(this);if(resume&&active){resume=false;pending=active;SceneManager.goto(Scene_Tactics);}};
const titleCommands=Window_TitleCommand.prototype.makeCommandList;
Window_TitleCommand.prototype.makeCommandList=function(){titleCommands.call(this);this.addCommand("Animaciones","tacticsAnimations");};
const titleWindow=Scene_Title.prototype.createCommandWindow;
Scene_Title.prototype.createCommandWindow=function(){titleWindow.call(this);this._commandWindow.setHandler("tacticsAnimations",()=>SceneManager.push(Scene_TacticsGallery));};
class Scene_TacticsGallery extends Scene_Base {
 create(){super.create();const data=database(),e=new T.Engine(data,{id:0,title:"Galería",width:1,height:1,tiles:[0],objective:"manual",units:[]});
  const canvas=document.createElement("canvas");canvas.width=Graphics.width;canvas.height=Graphics.height;this._canvas=canvas;this._bitmap=new Bitmap(Graphics.width,Graphics.height);this.addChild(new Sprite(this._bitmap));this._view=new T.View(canvas,e);this._view.attach(Graphics.app.view);this._view.openGallery();}
 update(){super.update();if(!this._view.gallery&&!this._view.form){SceneManager.pop();return;}this._view.draw();this._bitmap.context.drawImage(this._canvas,0,0);this._bitmap.baseTexture.update();}
 terminate(){super.terminate();this._view.destroy();this._bitmap.destroy();}
}
// The title uses the same panels as the tactical scene. Native new/load handlers remain in charge.
if(T.presentation){
 const createTitle=Scene_Title.prototype.create,updateTitle=Scene_Title.prototype.update,endTitle=Scene_Title.prototype.terminate;
 Scene_Title.prototype.create=function(){
  createTitle.call(this);this._commandWindow.hide();this._commandWindow.deactivate();
  const canvas=document.createElement('canvas');canvas.width=Graphics.width;canvas.height=Graphics.height;
  const engine=new T.Engine(database(),{id:0,title:'',width:1,height:1,units:[],objective:'manual'}),view=this._tacticsTitle=new T.View(canvas,engine);this._tacticsTitleBitmap=new Bitmap(Graphics.width,Graphics.height);this.addChild(new Sprite(this._tacticsTitleBitmap));this._tacticsTitleIndex=0;
  const items=this._tacticsTitleItems=[{label:'Nueva partida',fn:()=>this.commandNewGame()},{label:'Continuar',enabled:DataManager.isAnySavefileExists(),fn:()=>this.commandContinue()},{label:'Animaciones',fn:()=>SceneManager.push(Scene_TacticsGallery)},{label:'Controles',fn:()=>view.menu={type:'controls'}},{label:'Misiones del editor',fn:()=>{
   const f=view.formShell('Misiones del editor'),select=f.add('Misión','',1,$dataMapInfos.filter(Boolean).map(m=>({value:m.id,label:m.name})));f.button('Abrir misión',()=>{DataManager.setupNewGame();f.close();open(Number(select.value),false);});f.button('Volver',f.close);
  }}];
  view.key=k=>{if(view.form)return;if(view.menu){if(k==='Escape'||k==='Enter'||k==='z')view.menu=null;return;}if(k==='ArrowUp'||k==='ArrowDown')this._tacticsTitleIndex=(this._tacticsTitleIndex+(k==='ArrowUp'?items.length-1:1))%items.length;if(k==='Enter'||k==='z'||k===' '){const item=items[this._tacticsTitleIndex];if(item.enabled!==false)item.fn();}};
  view.click=(x,y)=>{if(view.form)return;const button=view.buttons.slice().reverse().find(b=>x>=b.x&&y>=b.y&&x<b.x+b.w&&y<b.y+b.h);if(button)button.fn();};view.attach(Graphics.app.view);
 };
 Scene_Title.prototype.update=function(){updateTitle.call(this);const v=this._tacticsTitle;if(!v)return;v.drawTitle('TacticsMZ',this._tacticsTitleItems,this._tacticsTitleIndex);if(v.menu){if(v.menu.type==='system')v.menu=null;else v.drawMenu();}this._tacticsTitleBitmap.context.clearRect(0,0,Graphics.width,Graphics.height);this._tacticsTitleBitmap.context.drawImage(v.canvas,0,0);this._tacticsTitleBitmap.baseTexture.update();};
 Scene_Title.prototype.terminate=function(){if(this._tacticsTitle){this._tacticsTitle.destroy();this._tacticsTitleBitmap.destroy();}endTitle.call(this);};
}
})(typeof globalThis!=="undefined"?globalThis:this);

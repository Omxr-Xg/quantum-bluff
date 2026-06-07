import bacBg from "../../assets/background/BAC.webp";
import bl1Bg from "../../assets/background/BL1.webp";
import ba1Bg from "../../assets/background/BA1.webp";
import bac2Bg from "../../assets/background/BAC2.webp";
import pokerImg from "../../assets/games/poker.webp";
import beloteImg from "../../assets/games/belote.webp";
import blackjackImg from "../../assets/games/blackjack.webp";
import rouletteImg from "../../assets/games/roulette.webp";
import slotImg from "../../assets/games/slot.webp";
import crashImg from "../../assets/games/crash.webp";
import minesImg from "../../assets/games/mines.webp";
import luckyImg from "../../assets/games/lucky.webp";
import type { SiteContent } from "./siteContent";

export const es: SiteContent = {
  home: {
    whatIsTitle: "¿Qué es Quantum Bluff?",
    whatIs: [
      "Quantum Bluff es una plataforma social de cartas y casino en línea, nacida de un proyecto liderado por un equipo de ocho personas y defendido ante un jurado universitario con felicitaciones. Desde el 1 de junio de 2026, el salón está abierto al público: más que un ejercicio académico, es un verdadero centro de entretenimiento donde poker, Belote, blackjack y minijuegos de casino conviven en una interfaz premium oscura y responsive.",
      "La promesa del producto se resume en una frase: cada victoria empieza con un farol. El Texas Hold'em multijugador invita a leer a los rivales y gestionar el stack; la Belote recupera el espíritu de las partidas entre amigos; los juegos en solitario — Crash, Mines, Lucky Number, ruleta retro o tragamonedas — ofrecen sesiones rápidas entre dos manos. Todo está conectado por un lobby unificado accesible desde el navegador o la aplicación móvil.",
      "La integridad técnica está en el corazón de la arquitectura: cada mano de poker, cada tirada de ruleta y cada ronda de minijuego se valida en el servidor antes de mostrarse. Las fichas son una moneda virtual interna, sin valor monetario real. Las ganas mediante la conexión diaria, los desafíos, las partidas y los eventos comunitarios — nunca a través de un servicio de juego de azar regulado.",
      "Quantum Bluff se distingue por su capa social nativa: amigos, mensajería, invitaciones en sala de espera, llamadas de voz uno a uno y llamadas grupales WebRTC, presencia en tiempo real y clasificaciones estacionales. La accesibilidad (alto contraste, alertas visuales, cinco idiomas) y la progresión por rangos y insignias acompañan tanto a jugadores ocasionales como a habituales del salón.",
      "Ya sea que descubras el producto en esta página, leas el blog Quantum Bluff News o crees directamente tu cuenta, entras en un ecosistema pensado para durar: actualizaciones mensuales, nuevos minijuegos, torneos comunitarios y mejora continua del sistema de voz. Bienvenido al salón — la mesa te espera.",
    ],
    gamesTitle: "Juegos disponibles",
    games: [
      {
        id: "holdem",
        name: "Texas Hold'em",
        description:
          "El poker no-limit por excelencia: salas públicas y privadas de dos a cinco jugadores, mesas contra bots para practicar, torneos estructurados y modo espectador. Ciegas, buy-in y temporizadores gestionados por el servidor para una experiencia fluida.",
        screenshot: pokerImg,
      },
      {
        id: "belote",
        name: "Belote",
        description:
          "Cuatro jugadores en una mesa estilo poker: Clásica, Coinchée, Contrée o Moderna. El anfitrión define el buy-in y la puntuación objetivo; el bote se redistribuye entre los ganadores. Sala de espera a pantalla completa y voz en mesa.",
        screenshot: beloteImg,
      },
      {
        id: "blackjack",
        name: "Blackjack",
        description:
          "Enfréntate al crupier en solitario o únete a una mesa multijugador del salón. Las reglas (hit, stand, double) se aplican en el servidor; el stack y las apuestas siguen el mismo libro de fichas que el resto de la plataforma.",
        screenshot: blackjackImg,
      },
      {
        id: "roulette",
        name: "Ruleta",
        description:
          "Ruleta europea en el hub casino retro: apuestas internas y externas, animación vintage y retorno fluido al salón. Un modo tutorial guiado está disponible desde el lobby para aprender los tipos de apuesta.",
        screenshot: rouletteImg,
      },
      {
        id: "slots",
        name: "Tragamonedas",
        description:
          "Máquina tragamonedas vintage en el universo retro: símbolos clásicos, efectos neón y tiradas validadas por el servidor. Ideal para una pausa rápida entre dos partidas de cartas sin salir del ambiente casino.",
        screenshot: slotImg,
      },
      {
        id: "crash",
        name: "Crash",
        description:
          "Sube el multiplicador y cobra antes del crash. Cada ronda se genera en la API: apuesta de 10 a 500 fichas, historial de cartera y animación en tiempo real sincronizada con el resultado del servidor.",
        screenshot: crashImg,
      },
      {
        id: "mines",
        name: "Mines",
        description:
          "Cuadrícula riesgo/recompensa: revela casillas sin tocar una mina para aumentar la ganancia. El sorteo es autoritativo del servidor; el cliente solo ilustra el estado de la cuadrícula y los pagos.",
        screenshot: minesImg,
      },
      {
        id: "lucky-number",
        name: "Lucky Number",
        description:
          "Apuesta por un número de la suerte en el hub retro. Sorteo instantáneo, coeficientes mostrados claramente y API dedicada POST /api/lucky-number/play para una trazabilidad completa de las ganancias.",
        screenshot: luckyImg,
      },
    ],
    socialTitle: "Funciones sociales",
    social: [
      {
        title: "Llamadas de voz",
        body: "Llama a un amigo desde el lobby o en mesa vía WebRTC: tono de llamada, tiempo de espera de 15 segundos, audio bidireccional y negociación SDP segura. El dock de voz es arrastrable durante la partida.",
      },
      {
        title: "Llamadas grupales",
        body: "Inicia una conversación de voz con varios participantes para coordinar una Belote o debriefing tras un torneo. VoiceCallManager gestiona los participantes y la continuidad entre mesa y sala de espera.",
      },
      {
        title: "Mensajería",
        body: "Intercambia mensajes privados con tus amigos, consulta el historial y responde desde el perfil o la lista de amigos. Las notificaciones in-app señalan las nuevas conversaciones.",
      },
      {
        title: "Clasificaciones",
        body: "El ranking mundial combina volumen de partidas, rendimiento en torneos y progresión de rango en un período móvil. Compara tu posición con la de tus amigos desde el lobby.",
      },
      {
        title: "Insignias y desafíos",
        body: "Desafíos diarios, conexión recompensada e hitos de progresión desbloquean insignias visibles en el perfil. Las recompensas son cosméticas o en fichas bonus — sin ventaja competitiva injusta.",
      },
      {
        title: "Sistema de amigos",
        body: "Añade jugadores, acepta solicitudes, invítalos a sala de espera de poker o Belote y ve su presencia en línea. Los amigos conectados aparecen con prioridad en el lobby.",
      },
    ],
    whyTitle: "¿Por qué Quantum Bluff?",
    why: [
      {
        title: "Gratis",
        body: "Creación de cuenta sin coste, fichas de inicio incluidas y ganancias mediante desafíos diarios y partidas. No se requiere depósito bancario real para jugar.",
      },
      {
        title: "Multiplataforma",
        body: "Navegador moderno (Chrome, Safari, Firefox, Edge), aplicación móvil Capacitor y cliente desktop Electron. Una sola progresión, sea cual sea el dispositivo.",
      },
      {
        title: "Tiempo real",
        body: "Sockets Socket.IO para multijugador, actualizaciones instantáneas del saldo y las salas, presencia en sala de espera y llamadas de voz de baja latencia.",
      },
      {
        title: "Progresión del jugador",
        body: "Rangos, estadísticas de perfil, historial de cartera y tutoriales integrados acompañan tu mejora a largo plazo.",
      },
    ],
    faqTitle: "Preguntas frecuentes",
    faq: [
      {
        q: "¿Es Quantum Bluff un casino de dinero real?",
        a: "No. Las fichas son virtuales. Las pantallas de pago o retiro son simulaciones educativas sin valor monetario real.",
      },
      {
        q: "¿El juego es gratuito?",
        a: "Sí. El registro es gratuito y recibes fichas de inicio. Puedes ganar más mediante desafíos diarios, partidas y eventos.",
      },
      {
        q: "¿En qué dispositivos puedo jugar?",
        a: "En navegador web, aplicación móvil (Capacitor) y cliente desktop (Electron). Se recomienda una conexión estable para multijugador y voz.",
      },
      {
        q: "¿Cómo funcionan las llamadas de voz?",
        a: "Desde el lobby o el perfil de amigo, inicia una llamada WebRTC. Suena un tono durante 15 segundos; si el amigo contesta, se establece audio bidireccional vía ICE/TURN.",
      },
      {
        q: "¿Puedo jugar con mis amigos?",
        a: "Sí: añádelos, invítalos a sala de espera de poker o Belote y usa la voz en mesa.",
      },
      {
        q: "¿Qué variantes de Belote están disponibles?",
        a: "Clásica, Coinchée, Contrée y Moderna. El anfitrión elige la variante, el buy-in y la puntuación objetivo antes del inicio.",
      },
      {
        q: "¿Cómo se calculan los minijuegos (Crash, Mines, etc.)?",
        a: "Cada apuesta va al servidor, que sortea el resultado y actualiza el saldo de forma atómica. El cliente solo muestra la animación.",
      },
      {
        q: "¿Cómo funciona la clasificación?",
        a: "Agrega actividad reciente, torneos y progresión de rango. Consulta el blog para los criterios detallados y las temporadas.",
      },
      {
        q: "¿Hay torneos?",
        a: "Sí, torneos estructurados de Texas Hold'em accesibles desde el lobby con salas de espera y pantalla de resultados dedicada.",
      },
      {
        q: "¿Qué idiomas están soportados?",
        a: "Francés, inglés, español, árabe y ucraniano. El selector de idioma está disponible desde el menú principal.",
      },
      {
        q: "¿Están protegidos mis datos?",
        a: "Consulta nuestra política de privacidad. Limitamos la recopilación a lo necesario del servicio y no vendemos tus datos.",
      },
      {
        q: "¿Hay límite de edad?",
        a: "El servicio está dirigido a personas de 18 años o más. Cualquier cuenta identificada como menor puede ser suspendida.",
      },
      {
        q: "¿Cómo denunciar a un jugador?",
        a: "Usa la herramienta de denuncia integrada en partida cuando esté disponible, o contacta support@quantum-bluff.com.",
      },
      {
        q: "¿Cómo contactar al equipo?",
        a: "Página de Contacto o correo support@quantum-bluff.com. Tiempo de respuesta habitual: 48 a 72 h laborables.",
      },
    ],
    ctaTitle: "¿Listo para jugar?",
    ctaBody: "Crea tu cuenta gratis, reclama tus fichas de bienvenida y únete a una mesa en segundos.",
  },
  discover: {
    metaTitle: "Descubre Quantum Bluff",
    heroTitle: "El casino social donde el farol se convierte en estrategia",
    heroSubtitle:
      "Texas Hold'em multijugador, Belote en línea, torneos, clasificación mundial y minijuegos de casino en solitario — todo en una experiencia premium pensada para móvil y escritorio.",
    intro: [
      "Quantum Bluff es una plataforma de cartas y casino en línea que reúne la pasión del poker, la convivencia de los salones multijugador y la emoción de las apuestas virtuales. Diseñado como un verdadero hub de entretenimiento, el proyecto coloca la equidad técnica en el centro: las manos, los sorteos y las ganancias de los minijuegos se validan en el servidor, lo que garantiza una experiencia coherente ya juegues una partida rápida en solitario o una mesa de Texas Hold'em a cinco jugadores.",
      "La identidad de Quantum Bluff se basa en una promesa simple: cada victoria empieza con un farol. El juego fomenta la lectura de los rivales, la gestión del stack y el dominio de las probabilidades, manteniéndose accesible gracias a tutoriales integrados, mesas contra bots y desafíos diarios que acompañan tu progresión.",
      "Ya sea que llegues para descubrir la ruleta retro, probar un jackpot en la tragamonedas, unirte a un torneo semanal o simplemente reunirte con tus amigos en una partida de Belote, el lobby unificado te permite llegar a todo en unos clics. Las fichas son moneda virtual de cuenta: sirven para apostar, inscribirse en eventos y desbloquear recompensas de progresión, sin pretender ser un servicio de juego de azar con dinero real.",
      "Esta página pública presenta toda la oferta de Quantum Bluff antes del inicio de sesión: funciones sociales, catálogo de juegos, sistema de clasificación, recompensas, vistas previas visuales y respuestas a las preguntas más frecuentes. Complementa la pantalla de inicio animada dando a nuevos jugadores — y socios — una visión clara y detallada del producto.",
    ],
    featuresTitle: "Funciones principales",
    features: [
      {
        title: "Salón multijugador unificado",
        body: "Crea o únete a salas de Texas Hold'em públicas o privadas, sigue las partidas en curso, acepta invitaciones de amigos y cambia entre poker, blackjack, Belote y juegos en solitario sin recargar la aplicación.",
      },
      {
        title: "Progresión y desafíos",
        body: "Desafíos diarios, conexión recompensada, historial de saldo y estadísticas de perfil motivan una práctica regular. El sistema de rangos refleja tu actividad y rendimiento a largo plazo.",
      },
      {
        title: "Social integrado",
        body: "Lista de amigos, mensajes, invitaciones en directo, llamadas de voz en mesa y presencia en sala de espera: Quantum Bluff está pensado para jugar en grupo, no solo contra la máquina.",
      },
      {
        title: "Seguridad y equidad",
        body: "Autenticación segura, validación en servidor de resultados de casino, registro de transacciones de fichas y moderación de denuncias para preservar una comunidad sana.",
      },
      {
        title: "Accesibilidad",
        body: "Alto contraste, alertas visuales, soporte multilingüe (francés, inglés, español, árabe, ucraniano) e interfaz responsive para smartphones, tablets y navegadores de escritorio.",
      },
    ],
    gamesTitle: "Juegos disponibles",
    games: [
      "Texas Hold'em — partidas contra bots, salas multijugador, torneos estructurados y modo espectador.",
      "Blackjack — en solitario contra el crupier o mesas multijugador del salón con reglas del servidor.",
      "Belote — salas de cuatro jugadores, variantes, buy-in y bote compartido según las reglas de la mesa.",
      "Juegos de casino en solitario — Crash, Mines, Wheel of Fortune, Lucky Number en el hub de novedades.",
      "Casino retro — Ruleta europea, tragamonedas vintage, clásicos del salón.",
      "Tutorial de ruleta — modo guiado paso a paso para aprender apuestas internas y externas.",
    ],
    leaderboardTitle: "Clasificación mundial",
    leaderboard: [
      "La clasificación de Quantum Bluff destaca a los jugadores más activos y con mejor rendimiento en un período móvil. Combina volumen de partidas, resultados en torneos y progresión de rango para evitar que una sola mano afortunada defina toda la jerarquía.",
      "Consulta el podio, compara tu posición con la de tus amigos y usa la clasificación como objetivo a medio plazo: subir de rango requiere regularidad, no solo un gran golpe en un minijuego.",
      "Las temporadas y eventos especiales pueden modificar los criterios de visualización; las reglas detalladas se indican en el artículo «Cómo funciona el sistema de rangos» del blog Quantum Bluff News.",
    ],
    rewardsTitle: "Recompensas y fichas",
    rewards: [
      "Las fichas son la moneda virtual interna. Las recibes mediante la conexión diaria, los desafíos, los códigos promocionales, los resultados de partidas y ciertos eventos comunitarios.",
      "Las ganancias y pérdidas en minijuegos de casino se registran en el historial de la cartera para una trazabilidad completa. Los importes en euros mostrados en pantallas de demostración son simulados y no implican transferencia bancaria real.",
      "Las recompensas de progresión (rangos, insignias, desafíos) están diseñadas para valorar el compromiso leal sin prometer ganancias financieras externas al juego.",
    ],
    screenshotsTitle: "Vistas previas de la experiencia",
    screenshots: [
      {
        src: bacBg,
        title: "Lobby principal",
        caption: "Navegación entre poker, blackjack, juegos en solitario y torneos desde un salón oscuro premium.",
      },
      {
        src: bl1Bg,
        title: "Mesas multijugador",
        caption: "Salas de espera, invitaciones de amigos y lanzamiento de partidas de Texas Hold'em en tiempo real.",
      },
      {
        src: ba1Bg,
        title: "Casino en solitario",
        caption: "Hub de minijuegos: Crash, Mines, rueda de la fortuna y clásicos retro.",
      },
      {
        src: bac2Bg,
        title: "Perfil y progresión",
        caption: "Saldo, rango, estadísticas y recompensas diarias accesibles desde el menú.",
      },
    ],
    faqTitle: "Preguntas frecuentes",
    faq: [
      {
        q: "¿Es Quantum Bluff un casino de dinero real?",
        a: "No. Las fichas son virtuales. Las pantallas de pago o retiro eventuales son simulaciones educativas para probar la interfaz, sin valor monetario real.",
      },
      {
        q: "¿Hay que pagar para empezar?",
        a: "La creación de cuenta es gratuita. Recibes fichas de inicio y puedes ganar más mediante desafíos diarios y partidas.",
      },
      {
        q: "¿En qué dispositivos puedo jugar?",
        a: "Navegador moderno (Chrome, Safari, Firefox, Edge) y aplicación móvil vía Capacitor. Se recomienda una conexión a internet estable para multijugador.",
      },
      {
        q: "¿Cómo se calculan los resultados de los minijuegos?",
        a: "Cada apuesta se envía al servidor, que sortea el resultado, debita y acredita el saldo de forma atómica. El cliente solo muestra la animación.",
      },
      {
        q: "¿Puedo jugar con mis amigos?",
        a: "Sí: añade amigos, invítalos a sala de espera de poker o Belote y usa el chat de voz en mesa cuando esté disponible.",
      },
      {
        q: "¿Cómo funciona la clasificación?",
        a: "Agrega actividad y rendimiento. Consulta el blog para el detalle de criterios y temporadas.",
      },
      {
        q: "¿Están protegidos mis datos?",
        a: "Consulta nuestra política de privacidad. Limitamos la recopilación a lo necesario del servicio y no vendemos tus datos personales.",
      },
      {
        q: "¿Cómo contactar al equipo?",
        a: "Usa la página de Contacto o escribe a support@quantum-bluff.com para consultas generales.",
      },
    ],
    ctaTitle: "¿Listo para entrar al salón?",
    ctaBody:
      "Crea tu cuenta en segundos, reclama tus fichas de bienvenida y únete a una mesa — o explora primero el tutorial de poker desde el lobby.",
  },
  about: {
    title: "Acerca de Quantum Bluff",
    sections: [
      {
        heading: "Nuestra misión",
        paragraphs: [
          "Quantum Bluff fue creado para ofrecer una alternativa social y elegante a los juegos de cartas en línea fragmentados. Queremos un solo lugar donde se reúna el poker entre amigos, la Belote del domingo por la noche y una ruleta rápida entre dos manos, sin sacrificar la calidad visual ni la integridad de los resultados.",
          "El equipo de producto y técnico itera continuamente según los comentarios de los jugadores: nuevos minijuegos, mejora del sistema de voz, torneos comunitarios y herramientas de moderación.",
        ],
      },
      {
        heading: "Valores",
        paragraphs: [
          "Transparencia sobre la moneda virtual, respeto a los jugadores, accesibilidad y diversión responsable. Fomentamos pausas regulares y recordamos que el juego debe seguir siendo un pasatiempo.",
        ],
      },
      {
        heading: "Editor",
        paragraphs: [
          "Quantum Bluff está editado por el equipo del proyecto Quantum Bluff. Para cualquier cuestión legal o asociación de prensa: legal@quantum-bluff.com.",
        ],
      },
    ],
  },
  contact: {
    title: "Contacto",
    intro: [
      "¿Una pregunta sobre tu cuenta, un error que reportar o una propuesta de asociación? Nuestro equipo de soporte atiende los mensajes de lunes a viernes.",
      "Antes de escribir, consulta la FAQ de la página Descubre y los artículos del blog — muchas respuestas ya están allí.",
    ],
    emailLabel: "Correo de soporte",
    email: "support@quantum-bluff.com",
    supportHours: "Tiempo de respuesta habitual: 48 a 72 h laborables.",
    formNote:
      "El formulario de abajo abre tu cliente de correo. Para denuncias de jugadores, usa la herramienta integrada en partida cuando sea posible.",
  },
  privacy: {
    title: "Política de privacidad",
    lastUpdated: "Mayo 2026",
    sections: [
      {
        heading: "1. Responsable del tratamiento",
        paragraphs: [
          "El equipo de Quantum Bluff trata los datos necesarios para el funcionamiento del juego (cuenta, partidas, saldo virtual, registros técnicos). Contacto: privacy@quantum-bluff.com.",
        ],
      },
      {
        heading: "2. Datos recopilados",
        paragraphs: [
          "Identificadores de cuenta (apodo, correo electrónico), hash de contraseña, preferencias de idioma y accesibilidad, historial de partidas y transacciones de fichas, registros de conexión y dirección IP para seguridad, mensajes de amigos y denuncias cuando corresponda.",
        ],
      },
      {
        heading: "3. Finalidades",
        paragraphs: [
          "Prestación del servicio multijugador, prevención del fraude, soporte al usuario, mejora del producto mediante estadísticas agregadas, cumplimiento de obligaciones legales.",
        ],
      },
      {
        heading: "4. Base legal",
        paragraphs: [
          "Ejecución del contrato (Términos de uso), interés legítimo (seguridad, mejora), consentimiento cuando sea requerido (cookies no esenciales, comunicaciones de marketing si están activadas).",
        ],
      },
      {
        heading: "5. Duración de conservación",
        paragraphs: [
          "Cuenta activa: datos conservados mientras exista la cuenta. Tras la eliminación: anonimización o supresión en 90 días salvo obligación legal contraria. Registros técnicos: hasta 12 meses.",
        ],
      },
      {
        heading: "6. Tus derechos",
        paragraphs: [
          "Acceso, rectificación, supresión, limitación, oposición y portabilidad cuando sea aplicable. Solicitud a privacy@quantum-bluff.com. Reclamación posible ante la autoridad de protección de datos de tu país.",
        ],
      },
      {
        heading: "7. Cookies y almacenamiento local",
        paragraphs: [
          "Token de sesión, preferencias i18n y parámetros de accesibilidad en localStorage. Sin reventa de datos a redes publicitarias de terceros en la versión actual del producto.",
        ],
      },
      {
        heading: "8. Transferencias",
        paragraphs: [
          "El alojamiento y los subcontratistas técnicos pueden estar situados fuera de la UE con garantías apropiadas (cláusulas contractuales tipo) cuando sea requerido.",
        ],
      },
      {
        heading: "9. Menores",
        paragraphs: [
          "El servicio está dirigido a personas de 18 años o más. Cualquier cuenta identificada como menor puede ser suspendida.",
        ],
      },
      {
        heading: "10. Actualizaciones",
        paragraphs: [
          "Esta política puede evolucionar. La fecha al inicio de la página indica la última revisión sustancial.",
        ],
      },
    ],
  },
  terms: {
    title: "Condiciones de uso",
    lastUpdated: "Mayo 2026",
    sections: [
      {
        heading: "1. Aceptación",
        paragraphs: [
          "Al crear una cuenta o usar Quantum Bluff, aceptas las presentes condiciones y la política de privacidad.",
        ],
      },
      {
        heading: "2. Naturaleza del servicio",
        paragraphs: [
          "Quantum Bluff es un juego en línea con fichas virtuales. No se garantiza ninguna ganancia monetaria real. Las fichas no tienen valor legal de curso fuera de la plataforma.",
        ],
      },
      {
        heading: "3. Cuenta de usuario",
        paragraphs: [
          "Eres responsable de la confidencialidad de tus credenciales. Una cuenta por persona física. El apodo y el comportamiento deben respetar a los demás jugadores.",
        ],
      },
      {
        heading: "4. Conducta prohibida",
        paragraphs: [
          "Trampa, colusión, acoso, elusión técnica, multicuentas abusivas y explotación de errores están prohibidos. Posibles sanciones: advertencia, suspensión, eliminación de cuenta.",
        ],
      },
      {
        heading: "5. Moneda virtual",
        paragraphs: [
          "Las compras o retiros simulados en la interfaz son demostraciones. El equipo puede ajustar los saldos en caso de error comprobado o fraude, con trazabilidad en el libro de fichas.",
        ],
      },
      {
        heading: "6. Propiedad intelectual",
        paragraphs: [
          "Marcas, visuales, código y contenidos están protegidos. Cualquier reproducción no autorizada está prohibida.",
        ],
      },
      {
        heading: "7. Disponibilidad",
        paragraphs: [
          "Servicio proporcionado «tal cual». Mantenimiento, actualizaciones e interrupciones temporales pueden ocurrir sin indemnización.",
        ],
      },
      {
        heading: "8. Limitación de responsabilidad",
        paragraphs: [
          "Dentro de los límites permitidos por la ley, Quantum Bluff no es responsable de pérdidas indirectas relacionadas con el uso del juego. Juega de forma responsable.",
        ],
      },
      {
        heading: "9. Resolución",
        paragraphs: [
          "Puedes eliminar tu cuenta a través del soporte. Podemos cerrar una cuenta en caso de violación de los Términos de uso.",
        ],
      },
      {
        heading: "10. Ley aplicable",
        paragraphs: [
          "Las presentes condiciones se rigen por el derecho francés salvo disposición imperativa contraria. Litigios: tribunales competentes tras intento de resolución amistosa.",
        ],
      },
    ],
  },
  news: {
    title: "Quantum Bluff News",
    subtitle: "Noticias, guías y registro de actualizaciones de la plataforma.",
    articles: [
      {
        slug: "lancement-public-1er-juin-2026",
        title: "1 de junio de 2026: Quantum Bluff se hace público",
        excerpt:
          "Fin del marco universitario, defensa ante dos miembros del jurado con felicitaciones y apertura al público — un equipo de ocho personas detrás del salón.",
        date: "2026-06-01",
        readMinutes: 6,
        tags: ["Anuncio", "Equipo"],
        body: [
          "El 1 de junio de 2026 marca un punto de inflexión para Quantum Bluff: el proyecto abandona su estatus de proyecto universitario para convertirse en una plataforma pública, accesible para todos vía web y aplicación móvil.",
          "La defensa se celebró ante un jurado compuesto por dos examinadores. El equipo presentó la arquitectura técnica (cliente React, servidor Node, sockets en tiempo real, validación en servidor de minijuegos), el módulo social de voz WebRTC, los juegos multijugador y el enfoque de accesibilidad. El jurado otorgó las felicitaciones del jurado, elogiando la coherencia del producto, la profundidad funcional y la calidad de la experiencia de usuario.",
          "Ocho personas contribuyeron a este proyecto a lo largo del tiempo: desarrollo full-stack, diseño de juegos, UX/UI, pruebas, despliegue (Vercel, Render, Supabase) y documentación. Este paso al público viene acompañado del sitio de marketing (/discover), las páginas legales y este hilo de noticias para documentar cada evolución.",
          "Gracias a todos los testers de la fase universitaria. Lo siguiente: torneos comunitarios, nuevos minijuegos y mejoras continuas del sistema de voz y la Belote. Únete al salón — cada victoria empieza con un farol.",
        ],
      },
      {
        slug: "changelog-mai-2026-site-public",
        title: "Changelog — Mayo 2026 (sitio público e inicio)",
        excerpt:
          "Páginas Descubre, legales, blog, enlaces del pie de página en inicio y corrección de build Vercel PWA.",
        date: "2026-05-29",
        readMinutes: 5,
        tags: ["Changelog", "Web"],
        body: [
          "• Página /discover: presentación completa (1000+ palabras), funciones, juegos, clasificación, recompensas, capturas y FAQ.",
          "• Páginas legales: /about, /contact, /privacy-policy, /terms-of-service.",
          "• Blog Quantum Bluff News: /news y artículos detallados.",
          "• Pantalla de inicio /: enlaces Descubre, Acerca de, Contacto, Privacidad y Términos bajo el botón EMPEZAR.",
          "• Corrección de despliegue Vercel: límite Workbox aumentado a 3 MB para el bundle JS principal.",
        ],
      },
      {
        slug: "changelog-mai-2026-casino-retro",
        title: "Changelog — Casino retro y acabados del lobby",
        excerpt:
          "Ruleta tema vintage, rediseño de tragamonedas, Lucky Number, Wheel corregida, lobby oscurecido y Belote a pantalla completa.",
        date: "2026-05-28",
        readMinutes: 7,
        tags: ["Changelog", "Casino"],
        body: [
          "• Hub de juegos en solitario renombrado y reorganizado: separación hub «novedades» y salón casino retro.",
          "• Ruleta europea: tema retro casino (retroCasino), retorno hacia /minigames/retro-casino.",
          "• Tragamonedas vintage: rediseño visual SlotMachine + shell MiniGames.",
          "• Lucky Number MVP: API POST /api/lucky-number/play, página /minigames/lucky-number, tests Jest.",
          "• Wheel of Fortune: leyenda de 12 segmentos, corrección de visualización de coeficientes (bug x2/x0,5), wheelMath.ts.",
          "• Lobby: fondo oscurecido (LobbyShellBackground brightness 0,32), mejor contraste de UI.",
          "• Sala de espera Belote: pantalla completa, eliminación de banda azul y menú hamburguesa en esa vista.",
        ],
      },
      {
        slug: "changelog-mai-2026-minijeux-solo",
        title: "Changelog — Minijuegos en solitario (Crash, Mines, Wheel)",
        excerpt:
          "Tres MVP autoritativos del servidor, hub Quick Solo y límites de apuesta unificados.",
        date: "2026-05-22",
        readMinutes: 6,
        tags: ["Changelog", "Casino"],
        body: [
          "• Crash MVP: multiplicador en tiempo real, rondas validadas por el servidor, ruta API dedicada.",
          "• Mines MVP: cuadrícula riesgo/recompensa, sorteo del servidor, pagos atómicos en el libro de fichas.",
          "• Wheel of Fortune MVP: rueda de 12 segmentos, animación del cliente sincronizada con resultado API.",
          "• Hub Quick Solo: pantallas Crash, Wheel y Mines estilizadas desde el lobby.",
          "• Contrato común: apuesta 10–500 fichas (paso de 10), anti doble clic, historial de cartera.",
          "• Correcciones móvil Mines: layout responsive y tipos de payout alineados con build del servidor.",
        ],
      },
      {
        slug: "changelog-mai-2026-seo-visuels",
        title: "Changelog — SEO, fondos visuales y despliegue web",
        excerpt: "Indexación Google, sitemap, meta tags, fondos BAC/BL1 y assets en raíz del dominio.",
        date: "2026-05-18",
        readMinutes: 4,
        tags: ["Changelog", "Web"],
        body: [
          "• Favicon público, meta tags SEO y sitemap.xml para indexación Google.",
          "• robots.txt y ads.txt servidos en la raíz del dominio (base path Vercel corregido).",
          "• Google Analytics: tag G-D1L20EJFPN integrado.",
          "• Fondos del cliente unificados: BAC splash en inicio y auth, BL1 lobby difuminado, variantes BAC2.",
          "• Loader: eslogan y splash BAC compartidos con StartScreen.",
        ],
      },
      {
        slug: "changelog-mai-2026-admin-vocal",
        title: "Changelog — Consola admin y llamadas de voz",
        excerpt:
          "Rediseño admin BADMIN, top-up QUANTUM, stack WebRTC 1v1 y grupo, tonos de llamada y métricas.",
        date: "2026-05-10",
        readMinutes: 8,
        tags: ["Changelog", "Admin", "Voz"],
        body: [
          "• Consola admin: fondo BADMIN, login unificado, enlace de retorno al cliente, eliminación de duplicado del selector de idioma.",
          "• Top-up de fichas QUANTUM restaurado en la interfaz admin.",
          "• Llamadas de voz en lobby: botón de llamada, modal saliente, tono de 15 s, tiempo de espera sin respuesta.",
          "• WebRTC: ofertas SDP, glare rollback, ICE/TURN, canal socket temprano, audio bidireccional corregido.",
          "• Llamadas 1v1 y grupo: VoiceCallManager dedicado, perfil de amigo, continuidad mesa → sala de espera.",
          "• Dock de voz en mesa: arrastrable, pausa de polling del lobby durante la llamada (reducción de carga API).",
          "• Presencia en sala de espera de poker, amigos en línea priorizados, last-seen en perfiles.",
          "• Documentación de arquitectura de voz (Docs/Architecture/voice.md).",
        ],
      },
      {
        slug: "changelog-avril-2026-belote",
        title: "Changelog — Módulo Belote completo",
        excerpt:
          "Belote V1, cuatro variantes, buy-in, espectador, temporizadores y sala de espera estilo poker.",
        date: "2026-04-30",
        readMinutes: 7,
        tags: ["Changelog", "Belote"],
        body: [
          "• Belote V1: salas multijugador, motor del servidor, sockets, cliente de producción.",
          "• Lobby Belote calquado en el poker: sala de espera, partidas con amigos, invitaciones.",
          "• Cuatro modos: Clásica, Coinchée, Contrée y Moderna.",
          "• Buy-in configurable y bote redistribuido entre ganadores.",
          "• Espectador activo y cierre de partidas fantasma.",
          "• Mesa poker Belote: presencia Socket.IO, temporizadores de turno, HUD compacto, cartas jugables destacadas.",
          "• Correcciones de subastas contrée, heroTeam snapshots, presencia en línea, avatar local no atenuado.",
        ],
      },
      {
        slug: "changelog-avril-2026-poker-social",
        title: "Changelog — Poker, tutoriales y social",
        excerpt:
          "Tutorial de ruleta, temporizador de servidor de poker, amigos, avatares NA.webp y rendimiento de carga.",
        date: "2026-04-15",
        readMinutes: 6,
        tags: ["Changelog", "Poker", "Social"],
        body: [
          "• Tutorial de ruleta: modo guiado paso a paso (/tutorial/roulette), botón en lobby.",
          "• Tutorial de poker: énfasis visual en objetivos, pulido de mesa y smoke tests.",
          "• Temporizador de servidor de poker mejorado, controles de mesa, sala de espera: navegación separada de eliminación de sala.",
          "• Red de amigos: solicitudes, mensajes, invitaciones en directo, perfil de amigo dedicado.",
          "• Avatar por defecto NA.webp, fallbacks de rivales alineados, rendimiento de avatares (fin de cargas largas).",
          "• Corrección de rendimiento en login: música de 4,7 MB retirada del precargado bloqueante al inicio.",
          "• Seguridad Supabase: RLS en tablas públicas, endurecimiento de advisors.",
        ],
      },
      {
        slug: "guide-texas-holdem-debuter",
        title: "Guía Texas Hold'em: empezar en el salón",
        excerpt: "Reglas esenciales, orden de apuestas y consejos para tus primeras mesas multijugador.",
        date: "2026-04-20",
        readMinutes: 8,
        tags: ["Guía", "Poker"],
        body: [
          "El Texas Hold'em reparte dos cartas privadas a cada jugador y cinco cartas comunitarias. La mejor mano de cinco cartas gana el bote.",
          "En Quantum Bluff, empieza por el modo bots para probar las rondas de apuesta sin presión. Pasa después a las salas públicas de dos a cinco jugadores: respeta las ciegas anunciadas y el buy-in mínimo.",
          "Consejo: juega tight en posición temprana, amplía ligeramente en el botón y usa el historial de manos para analizar tus sesiones. El tutorial integrado del lobby te guía paso a paso.",
        ],
      },
      {
        slug: "guide-belote-salons",
        title: "Guía Belote: crear una sala y lanzar una partida",
        excerpt: "Variantes, buy-in, presencia de los cuatro jugadores y desarrollo de una mano.",
        date: "2026-04-28",
        readMinutes: 7,
        tags: ["Guía", "Belote"],
        body: [
          "La Belote de Quantum Bluff se juega en salas de cuatro. El anfitrión define la variante, la puntuación objetivo y el buy-in en fichas antes del inicio.",
          "Cada jugador debe estar presente en la sala de espera y listo antes del lanzamiento. El bote se constituye con las apuestas de entrada y se distribuye según las reglas de la variante elegida.",
          "Usa la voz en mesa para coordinar tus equipos respetando el fair-play: ninguna comunicación externa está permitida en torneo oficial.",
        ],
      },
      {
        slug: "systeme-de-rangs-explication",
        title: "Cómo funciona el sistema de rangos",
        excerpt: "Criterios de progresión, vínculo con la clasificación y recompensas asociadas.",
        date: "2026-05-05",
        readMinutes: 5,
        tags: ["Guía", "Progresión"],
        body: [
          "Tu rango en Quantum Bluff sintetiza la experiencia acumulada: partidas jugadas, participación en torneos, desafíos diarios completados y ciertos hitos sociales.",
          "La clasificación mostrada destaca las mejores actuaciones recientes pero no se limita al rango: un jugador activo puede subir incluso tras una serie de partidas modestas.",
          "Las recompensas de rango son cosméticas o en fichas bonus según las temporadas. Ningún rango garantiza una ventaja competitiva injusta en mesas equitativas.",
        ],
      },
      {
        slug: "bienvenue-quantum-bluff-news",
        title: "Bienvenido a Quantum Bluff News",
        excerpt: "El hilo de noticias oficial: changelog, guías y calendario de eventos.",
        date: "2026-05-01",
        readMinutes: 3,
        tags: ["Anuncio"],
        body: [
          "Quantum Bluff News centraliza todas las actualizaciones del salón: changelog detallado por mes, guías de juego y anuncios importantes.",
          "Consulta los artículos más recientes para el lanzamiento público del 1 de junio de 2026, los minijuegos de casino, la Belote, la voz WebRTC y las evoluciones del lobby.",
          "Esta página se actualiza en cada despliegue significativo de develop → producción Vercel.",
        ],
      },
    ],
  },
};

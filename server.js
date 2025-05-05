// Cargar variables de entorno desde .env
require('dotenv').config();

// DEPENDENCIAS
const express   = require('express');
const mongoose  = require('mongoose');
const cors      = require('cors');
const jwt       = require('jsonwebtoken');
const multer    = require('multer');
const path      = require('path');

// CONFIGURACIÓN DE EXPRESS
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

// VARIABLES DE ENTORNO
const PORT      = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI;
const JWT_SECRET= process.env.JWT_SECRET;

// CONEXIÓN A MONGO ATLAS
mongoose.connect(MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('Conectado a MongoDB'))
.catch(err => console.error('Error al conectar a MongoDB:', err));

// CONFIGURACIÓN DE MULTER (para subir archivos, opcional)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, 'uploads'));
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});
const upload = multer({ storage });

//─────────────────────────────────────────────
// MODELO DE PERSONAJES
//─────────────────────────────────────────────
/*
Campos:
  - nombre: String
  - imagen: String
  - atributos: Objeto con { vit, fuerza, agi, ene, int, esp, ata, def, defm, atax } (Number)
  - equipo: Objeto con { arma, armadura, acesorio } (String)
  - expTotal: Number (por defecto 0)
  - nivel: Number (por defecto 1)
*/
const personajeSchema = new mongoose.Schema({
  nombre:   { type: String, required: true },
  imagen:   { type: String, required: true },
  atributos: {
    vit:     { type: Number, required: true },
    fuerza:  { type: Number, required: true },
    agi:     { type: Number, required: true },
    ene:     { type: Number, required: true },
    int:     { type: Number, required: true },
    esp:     { type: Number, required: true },
    ata:     { type: Number, required: true },
    def:     { type: Number, required: true },
    defm:    { type: Number, required: true },
    atax:    { type: Number, required: true }
  },
  equipo: {
    arma:       { type: String, default: '' },
    armadura:   { type: String, default: '' },
    acesorio:   { type: String, default: '' }
  },
  expTotal: { type: Number, default: 0 },
  nivel:    { type: Number, default: 1 }
});
const Personaje = mongoose.model('Personaje', personajeSchema);

//─────────────────────────────────────────────
// MODELO DE MONSTERS
//─────────────────────────────────────────────
/*
Campos:
  - img: String
  - nombre: String
  - vit, nivel, exp, guiles, fuerza, agi, ene, int, esp, ata, def, defm, atax: Number
*/
const monsterSchema = new mongoose.Schema({
  img:      { type: String, required: true },
  nombre:   { type: String, required: true },
  vit:      { type: Number, required: true },
  nivel:    { type: Number, required: true },
  exp:      { type: Number, required: true },
  guiles:   { type: Number, required: true },
  fuerza:   { type: Number, required: true },
  agi:      { type: Number, required: true },
  ene:      { type: Number, required: true },
  int:      { type: Number, required: true },
  esp:      { type: Number, required: true },
  ata:      { type: Number, required: true },
  def:      { type: Number, required: true },
  defm:     { type: Number, required: true },
  atax:     { type: Number, required: true }
});
const Monster = mongoose.model('Monster', monsterSchema);

//─────────────────────────────────────────────
// MODELO DE INVENTARIO CON DISCRIMINADORES
//─────────────────────────────────────────────
/*
Queremos tres estructuras dentro de la colección "inventories":
 
1) Para Consumibles (tipo "consumible"):
   - _id, nombre, descripcion, efecto, cantidad, compra, venta.
   - "efecto" es un objeto que incluye:
       • tipo: string (ej. "curación", "buff", etc.)
       • atributo: string
       • Y EXACTAMENTE uno de:
           - valor: number
           - porcentaje: number

2) Para Armas (tipo "arma"):
   - _id, nombre, ataque, cantidad, compra, venta.

3) Para Armaduras (tipo "cuerpo"):
   - _id, nombre, defensa, defensam, cantidad, compra, venta.
*/

// Esquema base (campos comunes)
const inventoryBaseSchema = new mongoose.Schema({
  nombre:   { type: String, required: true },
  cantidad: { type: Number, required: true },
  compra:   { type: Number, required: true },
  venta:    { type: Number, required: true }
}, {
  discriminatorKey: 'tipo', // Este campo distinguirá el tipo: "consumible", "arma" o "cuerpo"
  collection: 'inventory'
});
const InventoryItem = mongoose.model('InventoryItem', inventoryBaseSchema);

// A) Consumibles
// Sub-esquema para "efecto" de los consumibles
const efectoSchema = new mongoose.Schema({
  tipo:      { type: String, required: true },    // Ejemplo: "curación", "buff", etc.
  atributo:  { type: String, required: true },
  valor:     { type: Number },
  porcentaje:{ type: Number }
}, { _id: false });

// Validación: EXACTAMENTE uno entre "valor" o "porcentaje" debe estar definido
efectoSchema.pre('validate', function(next) {
  const tieneValor = (this.valor !== undefined && this.valor !== null);
  const tienePorcentaje = (this.porcentaje !== undefined && this.porcentaje !== null);
  if (!((tieneValor && !tienePorcentaje) || (!tieneValor && tienePorcentaje))) {
    return next(new Error('El objeto "efecto" debe tener o bien "valor" o bien "porcentaje", pero no ambos ni ninguno.'));
  }
  next();
});

const consumableSchema = new mongoose.Schema({
  descripcion: { type: String, required: true },
  efecto:      { type: efectoSchema, required: true }
});
const Consumable = InventoryItem.discriminator('consumible', consumableSchema);

// B) Armas (tipo "arma")
const weaponSchema = new mongoose.Schema({
  ataque: { type: Number, required: true }
});
const Weapon = InventoryItem.discriminator('arma', weaponSchema);

// C) Armaduras (tipo "cuerpo")
const armorSchema = new mongoose.Schema({
  defensa:  { type: Number, required: true },
  defensam: { type: Number, required: true }
});
const Armor = InventoryItem.discriminator('cuerpo', armorSchema);

//─────────────────────────────────────────────
// RUTAS DE LA API
//─────────────────────────────────────────────

// Ruta raíz de prueba
app.get('/', (req, res) => {
  res.send("Servidor backend del videojuego");
});

/* RUTAS PARA PERSONAJES */
// Obtener todos los personajes
app.get('/api/personajes', async (req, res) => {
  try {
    const personajes = await Personaje.find();
    res.status(200).json(personajes);
  } catch (error) {
    res.status(500).json({ message: "Error al obtener personajes", error });
  }
});


/* RUTAS PARA MONSTERS */
// Obtener todos los monsters
app.get('/api/monsters', async (req, res) => {
  try {
    const monsters = await Monster.find();
    res.status(200).json(monsters);
  } catch (error) {
    res.status(500).json({ message: "Error al obtener monsters", error });
  }
});


/* RUTAS PARA INVENTARIO */
// Obtener todos los items del inventario
app.get('/api/inventory', async (req, res) => {
  try {
    const items = await InventoryItem.find();
    res.status(200).json(items);
  } catch (error) {
    res.status(500).json({ message: "Error al obtener inventario", error });
  }
});



/* RUTAS PARA AUTENTICACIÓN CON JWT */
// Ruta de login (simulada)
app.post('/login', (req, res) => {
  const { username } = req.body;
  if (!username) return res.status(400).json({ message: 'El username es requerido.' });
  const token = jwt.sign({ username }, JWT_SECRET, { expiresIn: '1h' });
  res.status(200).json({ token });
});

// Middleware para verificar token JWT
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Formato: "Bearer <token>"
  if (!token) return res.sendStatus(401);
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
}

// Ruta protegida de ejemplo
app.get('/protected', authenticateToken, (req, res) => {
  res.status(200).json({ message: 'Acceso a ruta protegida', user: req.user });
});

// (Opcional) Ruta para subir archivos
app.post('/upload', upload.single('archivo'), (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'No se subió ningún archivo' });
  res.status(200).json({ message: 'Archivo subido con éxito', file: req.file });
});

//─────────────────────────────────────────────
// INICIAR EL SERVIDOR
//─────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`Servidor escuchando en http://localhost:${PORT}`);
});
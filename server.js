/*───────────────────────────────────────────────────────
  Proyecto Final: Final Fantasy III Fan

  Autor:        David Priego Puga
  Curso:        Desarrollo de Aplicaciones Web
  Fecha:        13 de Junio de 2025
  Archivo:      server.js

  Descripción:
  -------------------------------------------------------
  En este archivo podemos encontrar toda la configuración
  y logica del servidor backend de nuestro videojuego.
  
  De tal forma que podamos encontrar: dependiencias,
  conexión a la base de datos, modelos de datos y
  rutas de la API.

  Tenemos personajes, monsters, inventario y magias.
  Además de un bulk de personajes para poder
  actualizar varios personajes a la vez.

  Además de endpoints para obtener la posición de un personaje
  y para recoger y actualizar el equipo de un personaje.
  También tenemos un endpoint para lanzar magias y repartir
  curación entre varios personajes.
───────────────────────────────────────────────────────*/

// Cargar variables de entorno desde .env
require('dotenv').config();

// DEPENDENCIAS
const express   = require('express');
const mongoose  = require('mongoose');
const cors      = require('cors');
const jwt       = require('jsonwebtoken');
const multer    = require('multer');
const path      = require('path');
const fs        = require('fs');
const { ObjectId } = require('mongoose').Types;

// CONFIGURACIÓN DE EXPRESS
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

// VARIABLES DE ENTORNO
const PORT       = process.env.PORT || 5000;
const MONGO_URI  = process.env.MONGO_URI;
const JWT_SECRET = process.env.JWT_SECRET;

// CONEXIÓN A MONGO ATLAS
mongoose.connect(MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('Conectado a MongoDB'))
.catch(err => console.error('Error al conectar a MongoDB:', err));

// VERIFICAR Y CREAR CARPETA "uploads" SI NO EXISTE.
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

// CONFIGURACIÓN DE MULTER (OPCIONAL)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});
const upload = multer({ storage });

//─────────────────────────────────────────────
// MODELO DE PERSONAJES
//─────────────────────────────────────────────
const personajeSchema = new mongoose.Schema({
  nombre: { type: String, required: true },
  imagen: { type: String, required: true },
  atributos: {
    vit:    { type: Number, required: true },
    vit_act: { type: Number, required: true }, 
    pm:     { type: Number, required: true }, 
    pm_act: { type: Number, required: true }, 
    fuerza: { type: Number, required: true },
    agi:    { type: Number, required: true },
    ene:    { type: Number, required: true },
    int:    { type: Number, required: true },
    esp:    { type: Number, required: true },
    ata:    { type: Number, required: true },
    def:    { type: Number, required: true },
    defm:   { type: Number, required: true },
    atax:   { type: Number, required: true }
  },
  equipo: {
    arma:       { type: String, default: '' },
    armadura:   { type: String, default: '' },
    accesorio:  { type: String, default: '' }
  },
  expTotal: { type: Number, default: 0 },
  nivel:    { type: Number, default: 1 },
  formacion:{ type: String, default: 'vanguardia' },  
  posicion:{
    pos_x: { type: Number, default: 0 },
    pos_y: { type: Number, default: 0 }
  },
  magias: [{
    nombre: { type: String, required: true },
    descripcion: { type: String, required: true },
    coste: { type: Number, required: true },
    efecto: {
      tipo: { type: String, required: true },    
      valor: { type: Number, required: true }    
    }
  }]

});
const Personaje = mongoose.model('Personaje', personajeSchema);

//─────────────────────────────────────────────
// MODELO DE MONSTERS
//─────────────────────────────────────────────
const monsterSchema = new mongoose.Schema({
  img:     { type: String, required: true },
  nombre:  { type: String, required: true },
  vit:     { type: Number, required: true },
  nivel:   { type: Number, required: true },
  exp:     { type: Number, required: true },
  guiles:  { type: Number, required: true },
  fuerza:  { type: Number, required: true },
  agi:     { type: Number, required: true },
  ene:     { type: Number, required: true },
  int:     { type: Number, required: true },
  esp:     { type: Number, required: true },
  ata:     { type: Number, required: true },
  def:     { type: Number, required: true },
  defm:    { type: Number, required: true },
  atax:    { type: Number, required: true }
});
const Monster = mongoose.model('Monster', monsterSchema);

//─────────────────────────────────────────────
// MODELO DE INVENTARIO CON DISCRIMINADORES
//─────────────────────────────────────────────
/*
  Se manejan tres tipos: consumible, arma y cuerpo.
*/
const inventoryBaseSchema = new mongoose.Schema({
  nombre:   { type: String, required: true },
  cantidad: { type: Number, required: true },
  compra:   { type: Number, required: true },
  venta:    { type: Number, required: true }
}, {
  discriminatorKey: 'tipo',
  collection: 'inventory'
});
const InventoryItem = mongoose.model('InventoryItem', inventoryBaseSchema);

// A) Consumibles
const efectoSchema = new mongoose.Schema({
  tipo:       { type: String, required: true },
  atributo:   { type: String, required: true },
  valor:      { type: Number },
  porcentaje: { type: Number }
}, { _id: false });
efectoSchema.pre('validate', function(next) {
  const tieneValor = (this.valor !== undefined && this.valor !== null);
  const tienePorcentaje = (this.porcentaje !== undefined && this.porcentaje !== null);
  if (!((tieneValor && !tienePorcentaje) || (!tieneValor && tienePorcentaje))) {
    return next(new Error('El objeto "efecto" debe tener o bien "valor" o bien "porcentaje", pero no ambos ni ninguno.'));
  }
  next();
});
// A) Consumibles (tipo: "consumible")
const consumableSchema = new mongoose.Schema({
  descripcion: { type: String, required: true },
  efecto:      { type: efectoSchema, required: true }
});
const Consumable = InventoryItem.discriminator('consumible', consumableSchema);

// B) Armas (tipo: "arma")
const weaponSchema = new mongoose.Schema({
  ataque: { type: Number, required: true }
});
const Weapon = InventoryItem.discriminator('arma', weaponSchema);

// C) Armaduras (tipo: "cuerpo")
const armorSchema = new mongoose.Schema({
  defensa:   { type: Number, required: true },
  defensam:  { type: Number, required: true }
});
const Armor = InventoryItem.discriminator('cuerpo', armorSchema);

//─────────────────────────────────────────────
// FUNCION: RECALCULAR ATRIBUTOS DEL PERSONAJE
//─────────────────────────────────────────────
async function recalcularAtributos(pj) {
  // ATAQUE (arma)
  if (pj.equipo.arma) {
    const arma = await Weapon.findById(pj.equipo.arma);
    pj.atributos.ata = arma?.ataque || 0;
  } else {
    pj.atributos.ata = 0;
  }

  // DEFENSA (armadura)
  if (pj.equipo.armadura) {
    const armadura = await Armor.findById(pj.equipo.armadura);
    pj.atributos.def  = armadura?.defensa   || 0;
    pj.atributos.defm = armadura?.defensam || 0;
  } else {
    pj.atributos.def  = 0;
    pj.atributos.defm = 0;
  }

  return pj;
}


//─────────────────────────────────────────────
// RUTAS DE LA API
//─────────────────────────────────────────────

// RUTA DE PRUEBA PARA VERIFICAR QUE EL SERVIDOR ESTÁ CORRIENDO.
app.get('/', (req, res) => {
  res.send("Servidor backend del videojuego");
});

// RUTAS PARA PERSONAJES
app.get('/api/personajes', async (req, res) => {
  try {
    const personajes = await Personaje.find();
    res.status(200).json(personajes);
  } catch (error) {
    res.status(500).json({ message: "Error al obtener personajes", error });
  }
});

// RUTAS PARA MONSTERS
app.get('/api/monsters', async (req, res) => {
  try {
    const monsters = await Monster.find();
    res.status(200).json(monsters);
  } catch (error) {
    res.status(500).json({ message: "Error al obtener monsters", error });
  }
});

// RUTAS PARA INVENTARIO
app.get('/api/inventory', async (req, res) => {
  try {
    const items = await InventoryItem.find();
    res.status(200).json(items);
  } catch (error) {
    res.status(500).json({ message: "Error al obtener inventario", error });
  }
});

// PATCH /api/personajes/:id/equipo
// Cuerpo: { slot: "arma"|"armadura"|"accesorio", itemId: "<_id del inventario>", recalc: true? }
app.patch('/api/personajes/:id/equipo', async (req, res) => {
  const { slot, itemId } = req.body;

  const pj = await Personaje.findById(req.params.id);
  if (!pj) return res.status(404).json({ error: 'Personaje no encontrado' });

  pj.equipo[slot] = itemId;

  await recalcularAtributos(pj);
  await pj.save();

  res.json(pj);
});

// GET PARA RECUPERAR LA POSICIÓN DE UN PERSONAJE PARA USAR EN EL MAPA.
app.get('/api/personajes/:id/posicion', async (req, res) => {
  try {
    const pj = await Personaje.findById(req.params.id);
    if (!pj) return res.status(404).json({ error: 'Personaje no encontrado' });

    res.json({ posicion: pj.posicion });
  } catch (err) {
    console.error('Error obteniendo posición:', err);
    res.status(500).json({ error: 'Error del servidor al obtener posición.' });
  }
});

// PATCH /api/personajes/formacion  
// Cuerpo: { formaciones: [{ id: "<_id>", formacion: "vanguardia|retaguardia" }] }
app.patch('/api/personajes/formacion', async (req, res) => {
  const formaciones = req.body.formaciones;
  if (!Array.isArray(formaciones)) {
    return res.status(400).json({ error: 'Formato inválido. Se esperaba un array.' });
  }
  try {
    const bulkOps = formaciones.map(p => ({
      updateOne: {
        filter: { _id: new ObjectId(p.id) },
        update: { $set: { formacion: p.formacion } }
      }
    }));
    const result = await Personaje.bulkWrite(bulkOps);
    res.json({ message: 'Formación actualizada.', modifiedCount: result.modifiedCount });
  } catch (err) {
    console.error('Error actualizando formaciones:', err);
    res.status(500).json({ error: 'Error del servidor al actualizar formaciones.' });
  }
});

// ─── PATCH /api/personajes/bulk ─────────────────────────────
// EL BULK DE PERSONAJES PERMITE ACTUALIZAR MÚLTIPLES PERSONAJES A LA VEZ.
app.patch('/api/personajes/bulk', async (req, res) => {
  try {
    const updates = req.body.personajes;
    if (!Array.isArray(updates)) {
      return res.status(400).json({ error: 'Se esperaba un array "personajes"' });
    }

    // Construimos un bulkWrite de mongoose
    const ops = updates.map(pj => {
      const upd = {};

      // Campos simples
      if (pj.nivel    != null) upd.nivel     = pj.nivel;
      if (pj.expTotal != null) upd.expTotal  = pj.expTotal;
      if (pj.vit_act  != null) upd['atributos.vit_act'] = pj.atributos.vit_act;
      if (pj.pm_act   != null) upd['atributos.pm_act']  = pj.atributos.pm_act;
      if (pj.formacion)        upd.formacion = pj.formacion;
      if (pj.equipo)           upd.equipo    = pj.equipo;

      // Atributos anidados (vit, fuerza, agi, ene, int, esp, ata, def, defm, atax)
      if (pj.atributos) {
        Object.entries(pj.atributos).forEach(([k,v]) => {
          if (v != null && !['vit_act','pm_act'].includes(k)) {
            upd[`atributos.${k}`] = v;
          }
        });
      }

      // posicion del personaje
      if(pj.posicion){
        if(pj.posicion.pos_x != null) upd['posicion.pos_x'] = pj.posicion.pos_x;
        if(pj.posicion.pos_y != null) upd['posicion.pos_y'] = pj.posicion.pos_y;
      }

      return {
        updateOne: {
          filter: { _id: pj.id },
          update: { $set: upd }
        }
      };
    });

    const result = await Personaje.bulkWrite(ops);
    res.json({ ok: true, modifiedCount: result.modifiedCount });
  }
  catch (err) {
    console.error('Error en bulk save personajes:', err);
    res.status(500).json({ error: 'Error al guardar personajes en lote.' });
  }
});



// POST /api/magia/cast
// Body: { casterId, spellIndex, targetIds: [array de _id’s] }
app.post('/api/magia/cast', async (req, res) => {
  try {
    const { casterId, spellIndex, targetIds } = req.body;
    const caster = await Personaje.findById(casterId);
    if (!caster) return res.status(404).json({ error: 'Caster no encontrado' });

    const spell = caster.magias[spellIndex];
    if (!spell) return res.status(400).json({ error: 'Hechizo no existe' });

    // 1) Restar MP al caster
    caster.atributos.pm_act = Math.max(0, caster.atributos.pm_act - spell.coste);

    // 2) Repartir curación
    const pts = spell.efecto.valor;
    const n = targetIds.length;
    const porTarget = Math.floor(pts / n);

    const targets = await Personaje.find({ _id: { $in: targetIds } });
    for (let t of targets) {
      t.atributos.vit_act = Math.min(t.atributos.vit_act + porTarget, t.atributos.vit);
      await t.save();
    }
    await caster.save();

    return res.json({ caster, targets });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Error en casting' });
  }
});

//─────────────────────────────────────────────
// INICIAR EL SERVIDOR
//─────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`Servidor escuchando en http://localhost:${PORT}`);
});
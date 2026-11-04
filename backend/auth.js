const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const JWT_SECRET = 'madatech-secreto-dev-cambiar'; // Fase 4: moverlo a .env

// Recuperacion de contrasena (version de demostracion, sin servicio de correo).
// Los codigos viven en memoria: duran 15 minutos y se pierden si se reinicia el servidor.
const CODIGO_MINUTOS = 15;
const CODIGO_MAX_INTENTOS = 5;
const codigosRecuperacion = new Map(); // correo -> { codigo, expira, intentos }

// Revisa que la petición traiga un token válido
function verificarToken(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Inicia sesión primero' });
  try {
    req.usuario = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Sesión inválida o vencida' });
  }
}

function crearToken(u) {
  return jwt.sign(
    { id: u.id_usuario, nombre: u.nombre, rol: u.rol },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

function configurarAuth(app, pool) {
  // Registro
  app.post('/api/registro', async (req, res) => {
    try {
      const { nombre, correo, contrasena } = req.body;
      if (!nombre || !correo || !contrasena)
        return res.status(400).json({ error: 'Completa todos los campos' });
      if (!/^\S+@\S+\.\S+$/.test(correo))
        return res.status(400).json({ error: 'Correo no válido' });
      if (contrasena.length < 6)
        return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });

      const mail = correo.trim().toLowerCase();
      const [existe] = await pool.query('SELECT id_usuario FROM usuarios WHERE correo = ?', [mail]);
      if (existe.length) return res.status(409).json({ error: 'Ese correo ya está registrado' });

      const hash = await bcrypt.hash(contrasena, 10);
      const [r] = await pool.query(
        'INSERT INTO usuarios (nombre, correo, contrasena_hash) VALUES (?, ?, ?)',
        [nombre.trim(), mail, hash]
      );
      const u = { id_usuario: r.insertId, nombre: nombre.trim(), rol: 'cliente' };
      res.status(201).json({
        token: crearToken(u),
        usuario: { id: u.id_usuario, nombre: u.nombre, rol: u.rol }
      });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'Error del servidor' });
    }
  });

  // Login
  app.post('/api/login', async (req, res) => {
    try {
      const { correo, contrasena } = req.body;
      if (!correo || !contrasena)
        return res.status(400).json({ error: 'Escribe correo y contraseña' });

      const [rows] = await pool.query(
        'SELECT * FROM usuarios WHERE correo = ? AND activo = 1',
        [correo.trim().toLowerCase()]
      );
      const u = rows[0];
      if (!u || !(await bcrypt.compare(contrasena, u.contrasena_hash)))
        return res.status(401).json({ error: 'Correo o contraseña incorrectos' });

      res.json({
        token: crearToken(u),
        usuario: { id: u.id_usuario, nombre: u.nombre, rol: u.rol }
      });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'Error del servidor' });
    }
  });

  // Paso 1 de recuperacion: genera un codigo de 6 digitos para el correo.
  // DEMO: como no hay correo real, el codigo se devuelve en la respuesta (codigo_demo).
  // En un sitio real se enviaria por email y NO se devolveria aqui.
  app.post('/api/recuperar', async (req, res) => {
    try {
      const correo = String((req.body && req.body.correo) || '').trim().toLowerCase();
      if (!/^\S+@\S+\.\S+$/.test(correo))
        return res.status(400).json({ error: 'Escribe un correo válido' });

      const [rows] = await pool.query(
        'SELECT id_usuario FROM usuarios WHERE correo = ? AND activo = 1',
        [correo]
      );
      if (!rows.length) return res.json({ ok: true }); // misma respuesta, sin codigo

      const codigo = String(crypto.randomInt(0, 1000000)).padStart(6, '0');
      codigosRecuperacion.set(correo, {
        codigo,
        expira: Date.now() + CODIGO_MINUTOS * 60 * 1000,
        intentos: 0,
      });
      res.json({ ok: true, codigo_demo: codigo });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'Error del servidor' });
    }
  });

  // Paso 2: valida el codigo y guarda la nueva contrasena
  app.post('/api/restablecer', async (req, res) => {
    try {
      const { correo, codigo, contrasena } = req.body || {};
      const mail = String(correo || '').trim().toLowerCase();
      const pass = typeof contrasena === 'string' ? contrasena : '';

      if (!mail || !codigo || !pass)
        return res.status(400).json({ error: 'Completa todos los campos' });
      if (pass.length < 6)
        return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });

      const reg = codigosRecuperacion.get(mail);
      if (!reg || Date.now() > reg.expira) {
        codigosRecuperacion.delete(mail);
        return res.status(400).json({ error: 'El código venció o no existe. Pide uno nuevo.' });
      }
      if (reg.intentos >= CODIGO_MAX_INTENTOS) {
        codigosRecuperacion.delete(mail);
        return res.status(429).json({ error: 'Demasiados intentos. Pide un código nuevo.' });
      }
      if (String(codigo).trim() !== reg.codigo) {
        reg.intentos += 1;
        return res.status(400).json({ error: 'Código incorrecto' });
      }

      const hash = await bcrypt.hash(pass, 10);
      await pool.query(
        'UPDATE usuarios SET contrasena_hash = ? WHERE correo = ? AND activo = 1',
        [hash, mail]
      );
      codigosRecuperacion.delete(mail);
      res.json({ ok: true });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'Error del servidor' });
    }
  });

  // Perfil: sirve para comprobar que la sesión sigue activa al recargar
  app.get('/api/perfil', verificarToken, (req, res) => {
    res.json({ id: req.usuario.id, nombre: req.usuario.nombre, rol: req.usuario.rol });
  });
}

module.exports = { configurarAuth, verificarToken };
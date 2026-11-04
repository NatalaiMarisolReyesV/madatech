// backend/pedidos.js
// Fase 2: compra real. Crea pedidos en una transaccion, descuenta stock
// y toma los precios de la base de datos (nunca del navegador).
// Fase 3a: el historial (GET /api/mis-pedidos) ahora incluye foto y estado del pago.
// Pagos: si el metodo es tarjeta, se valida numero (16), vencimiento (MM/AA) y CVV (3).
// Los datos de la tarjeta SOLO se validan: nunca se guardan en la base de datos.

const { verificarToken } = require('./auth');

// ---- Reglas de negocio (cambia aqui si hace falta) ----
const IVA = 0.16;                  // los precios de productos YA incluyen IVA
const ENVIO_GRATIS_DESDE = 1500;   // envio gratis si los productos suman esto o mas
const COSTO_ENVIO = 99;            // costo de envio si no llega al minimo
const METODOS_PAGO = ['tarjeta', 'transferencia', 'paypal'];

const redondear = (n) => Math.round(n * 100) / 100;

// Error con codigo HTTP para responder mensajes claros
function fallo(status, mensaje) {
  return { status, mensaje };
}

// Solo acepta texto o numeros. Arreglos, objetos, null, etc. cuentan como vacio.
function comoTexto(valor) {
  return typeof valor === 'string' || typeof valor === 'number' ? String(valor) : '';
}

// Valida los datos de tarjeta. Lanza fallo(400, ...) si algo esta mal.
function validarTarjeta(tarjeta) {
  if (!tarjeta || typeof tarjeta !== 'object' || Array.isArray(tarjeta))
    throw fallo(400, 'Escribe los datos de la tarjeta');

  const numero = comoTexto(tarjeta.numero).replace(/[\s-]/g, '');
  if (!numero)
    throw fallo(400, 'Escribe el numero de tarjeta');
  if (!/^\d+$/.test(numero))
    throw fallo(400, 'El numero de tarjeta solo puede tener digitos');
  if (numero.length < 16)
    throw fallo(400, `Faltan numeros en la tarjeta: tiene ${numero.length} de 16`);
  if (numero.length > 16)
    throw fallo(400, `La tarjeta tiene ${numero.length} numeros y deben ser 16`);

  const venc = comoTexto(tarjeta.vencimiento).trim();
  if (!/^\d{2}\/\d{2}$/.test(venc))
    throw fallo(400, 'El vencimiento debe tener el formato MM/AA');
  const mes = Number(venc.slice(0, 2));
  const anio = 2000 + Number(venc.slice(3, 5));
  if (mes < 1 || mes > 12)
    throw fallo(400, 'El mes de vencimiento debe estar entre 01 y 12');
  const hoy = new Date();
  if (anio < hoy.getFullYear() || (anio === hoy.getFullYear() && mes < hoy.getMonth() + 1))
    throw fallo(400, 'La tarjeta esta vencida');

  const cvv = comoTexto(tarjeta.cvv).trim();
  if (!/^\d{3}$/.test(cvv))
    throw fallo(400, 'El CVV debe tener 3 numeros');
}

// Transferencia: referencia de exactamente 10 digitos. Devuelve la referencia limpia.
function validarTransferencia(transferencia) {
  const ref = comoTexto(transferencia && transferencia.referencia).trim();
  if (!ref) throw fallo(400, 'Escribe el numero de referencia de la transferencia');
  if (!/^\d+$/.test(ref)) throw fallo(400, 'La referencia solo puede tener numeros');
  if (ref.length < 10) throw fallo(400, `Faltan numeros en la referencia: tiene ${ref.length} de 10`);
  if (ref.length > 10) throw fallo(400, `La referencia tiene ${ref.length} numeros y deben ser 10`);
  return ref;
}

// PayPal: correo valido de la cuenta
function validarPaypal(paypal) {
  const correo = comoTexto(paypal && paypal.correo).trim();
  if (!correo) throw fallo(400, 'Escribe el correo de tu cuenta PayPal');
  if (correo.length > 100 || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(correo))
    throw fallo(400, 'El correo de PayPal no es valido');
}


// Factura (opcional): valida y limpia los datos fiscales. Devuelve null si no pidio factura.
const REGIMENES = ['601', '603', '605', '606', '612', '616', '621', '626'];
const USOS_CFDI = ['G01', 'G03', 'S01'];

function validarFactura(f) {
  if (f === undefined || f === null) return null;
  if (typeof f !== 'object' || Array.isArray(f))
    throw fallo(400, 'Los datos de facturacion no son validos');

  const rfc = comoTexto(f.rfc).trim().toUpperCase();
  const razon = comoTexto(f.razon_social).trim();
  const correo = comoTexto(f.correo).trim();
  const cp = comoTexto(f.codigo_postal).trim();
  const regimen = comoTexto(f.regimen_fiscal).trim();
  const uso = comoTexto(f.uso_cfdi).trim();

  if (!/^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$/.test(rfc)) throw fallo(400, 'El RFC de facturacion no es valido');
  if (!razon || razon.length > 150) throw fallo(400, 'Escribe el nombre o razon social (maximo 150 caracteres)');
  if (correo.length > 100 || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(correo))
    throw fallo(400, 'El correo de facturacion no es valido');
  if (!/^\d{5}$/.test(cp)) throw fallo(400, 'El codigo postal fiscal debe tener 5 numeros');
  if (!REGIMENES.includes(regimen)) throw fallo(400, 'Elige un regimen fiscal valido');
  if (!USOS_CFDI.includes(uso)) throw fallo(400, 'Elige un uso de CFDI valido');

  return { rfc, razon_social: razon, correo, codigo_postal: cp, regimen_fiscal: regimen, uso_cfdi: uso };
}

// La tabla se crea sola la primera vez (no hace falta tocar la BD a mano).
// Sin FOREIGN KEY a proposito para no depender del tipo exacto de pedidos.id_pedido.
const SQL_TABLA_FACTURAS = `
  CREATE TABLE IF NOT EXISTS facturas (
    id_factura INT AUTO_INCREMENT PRIMARY KEY,
    id_pedido INT NOT NULL UNIQUE,
    rfc VARCHAR(13) NOT NULL,
    razon_social VARCHAR(150) NOT NULL,
    correo VARCHAR(100) NOT NULL,
    codigo_postal CHAR(5) NOT NULL,
    regimen_fiscal VARCHAR(3) NOT NULL,
    uso_cfdi VARCHAR(3) NOT NULL,
    fecha_solicitud TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`;

function configurarPedidos(app, pool) {
  pool.query(SQL_TABLA_FACTURAS).catch((e) => console.error('No se pudo crear la tabla facturas:', e.message));

  app.post('/api/pedidos', verificarToken, async (req, res) => {
    const { items, direccion, id_direccion, metodo_pago, tarjeta, transferencia, paypal, factura } = req.body || {};
    const idUsuario = req.usuario.id;
    let conn;

    try {
      // ---------- 1. Validar lo que llega ----------
      if (!Array.isArray(items) || items.length === 0)
        throw fallo(400, 'Tu carrito esta vacio');

      if (!METODOS_PAGO.includes(metodo_pago))
        throw fallo(400, 'Elige un metodo de pago valido');

      // Si paga con tarjeta, revisar numero, vencimiento y CVV
      if (metodo_pago === 'tarjeta') validarTarjeta(tarjeta);

      // Transferencia: validar la referencia (se guarda como id de transaccion)
      let refTransferencia = null;
      if (metodo_pago === 'transferencia') refTransferencia = validarTransferencia(transferencia);

      // PayPal: validar el correo (no se guarda)
      if (metodo_pago === 'paypal') validarPaypal(paypal);

      // Factura: opcional, pero si viene debe estar completa y valida
      const datosFactura = validarFactura(factura);

      // Juntar productos repetidos: id -> cantidad total
      const pedido = new Map();
      for (const it of items) {
        const id = Number(it.id);
        const cantidad = Number(it.cantidad);
        if (!Number.isInteger(id) || !Number.isInteger(cantidad) || cantidad < 1 || cantidad > 99)
          throw fallo(400, 'Hay un producto con datos invalidos');
        pedido.set(id, (pedido.get(id) || 0) + cantidad);
      }

      if (!id_direccion) {
        if (!direccion || !String(direccion.calle || '').trim() || !String(direccion.ciudad || '').trim())
          throw fallo(400, 'Escribe la calle y la ciudad de envio');
      }

      // ---------- 2. Abrir transaccion ----------
      conn = await pool.getConnection();
      await conn.beginTransaction();

      // ---------- 3. Leer productos desde la BD y bloquearlos ----------
      const ids = [...pedido.keys()];
      const [productos] = await conn.query(
        'SELECT id_producto, nombre, precio, stock FROM productos WHERE id_producto IN (?) AND activo = 1 FOR UPDATE',
        [ids]
      );
      if (productos.length !== ids.length)
        throw fallo(400, 'Uno de los productos ya no existe');

      let sumaProductos = 0;
      const lineas = [];
      for (const p of productos) {
        const cantidad = pedido.get(p.id_producto);
        if (p.stock < cantidad)
          throw fallo(409, `No hay suficiente stock de "${p.nombre}" (quedan ${p.stock})`);
        const subtotalLinea = redondear(Number(p.precio) * cantidad);
        sumaProductos += subtotalLinea;
        lineas.push({
          id_producto: p.id_producto,
          nombre: p.nombre,
          cantidad,
          precio: Number(p.precio),
          subtotalLinea,
        });
      }
      sumaProductos = redondear(sumaProductos);

      // ---------- 4. Calcular totales ----------
      const costoEnvio = sumaProductos >= ENVIO_GRATIS_DESDE ? 0 : COSTO_ENVIO;
      const subtotal = redondear(sumaProductos / (1 + IVA));   // sin IVA
      const impuestos = redondear(sumaProductos - subtotal);   // IVA desglosado
      const total = redondear(sumaProductos + costoEnvio);

      // ---------- 5. Direccion ----------
      let idDir = id_direccion;
      if (idDir) {
        const [dir] = await conn.query(
          'SELECT id_direccion FROM direcciones WHERE id_direccion = ? AND id_usuario = ?',
          [idDir, idUsuario]
        );
        if (!dir.length) throw fallo(400, 'La direccion elegida no es valida');
      } else {
        const [r] = await conn.query(
          'INSERT INTO direcciones (id_usuario, etiqueta, calle, ciudad, codigo_postal, pais) VALUES (?, ?, ?, ?, ?, ?)',
          [
            idUsuario,
            (direccion.etiqueta || 'Casa').toString().trim().slice(0, 50),
            direccion.calle.toString().trim().slice(0, 255),
            direccion.ciudad.toString().trim().slice(0, 100),
            direccion.codigo_postal ? direccion.codigo_postal.toString().trim().slice(0, 10) : null,
            (direccion.pais || 'Mexico').toString().trim().slice(0, 100),
          ]
        );
        idDir = r.insertId;
      }

      // ---------- 6. Pedido ----------
      const [rp] = await conn.query(
        'INSERT INTO pedidos (id_usuario, id_direccion, subtotal, impuestos, costo_envio, total, estado) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [idUsuario, idDir, subtotal, impuestos, costoEnvio, total, 'pagado']
      );
      const idPedido = rp.insertId;

      // ---------- 7. Detalle + descontar stock ----------
      for (const l of lineas) {
        await conn.query(
          'INSERT INTO detalle_pedido (id_pedido, id_producto, nombre_producto, cantidad, precio_unitario, subtotal_linea) VALUES (?, ?, ?, ?, ?, ?)',
          [idPedido, l.id_producto, l.nombre, l.cantidad, l.precio, l.subtotalLinea]
        );
        await conn.query(
          'UPDATE productos SET stock = stock - ? WHERE id_producto = ?',
          [l.cantidad, l.id_producto]
        );
      }

      // ---------- 8. Pago simulado (los datos de tarjeta NO se guardan) ----------
      const idTransaccion = refTransferencia
        ? 'TRF-' + refTransferencia
        : 'SIM-' + Date.now() + '-' + Math.floor(Math.random() * 9000 + 1000);
      await conn.query(
        'INSERT INTO pagos (id_pedido, metodo_pago, id_transaccion, monto, estado_pago) VALUES (?, ?, ?, ?, ?)',
        [idPedido, metodo_pago, idTransaccion, total, 'aprobado']
      );

      // ---------- 8b. Datos de facturacion (si los pidio) ----------
      if (datosFactura) {
        await conn.query(
          'INSERT INTO facturas (id_pedido, rfc, razon_social, correo, codigo_postal, regimen_fiscal, uso_cfdi) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [idPedido, datosFactura.rfc, datosFactura.razon_social, datosFactura.correo,
           datosFactura.codigo_postal, datosFactura.regimen_fiscal, datosFactura.uso_cfdi]
        );
      }

      // ---------- 9. Confirmar todo ----------
      await conn.commit();
      res.status(201).json({
        id_pedido: idPedido,
        subtotal,
        impuestos,
        costo_envio: costoEnvio,
        total,
        estado: 'pagado',
        id_transaccion: idTransaccion,
        factura: datosFactura ? { rfc: datosFactura.rfc } : null,
      });
    } catch (e) {
      if (conn) {
        try { await conn.rollback(); } catch (_) { /* ya no importa */ }
      }
      if (e && e.status) return res.status(e.status).json({ error: e.mensaje });
      console.error(e);
      res.status(500).json({ error: 'No se pudo completar la compra' });
    } finally {
      if (conn) conn.release();
    }
  });

  // Historial de pedidos del usuario con sesion iniciada
  app.get('/api/mis-pedidos', verificarToken, async (req, res) => {
    try {
      const [pedidos] = await pool.query(
        `SELECT p.id_pedido, p.fecha_pedido, p.subtotal, p.impuestos, p.costo_envio,
                p.total, p.estado, pg.metodo_pago, pg.id_transaccion, pg.estado_pago,
                f.rfc AS factura_rfc
         FROM pedidos p
         LEFT JOIN pagos pg ON pg.id_pedido = p.id_pedido
         LEFT JOIN facturas f ON f.id_pedido = p.id_pedido
         WHERE p.id_usuario = ?
         ORDER BY p.fecha_pedido DESC, p.id_pedido DESC`,
        [req.usuario.id]
      );
      if (!pedidos.length) return res.json([]);

      const [detalle] = await pool.query(
        `SELECT d.id_pedido, d.id_producto, d.nombre_producto, d.cantidad,
                d.precio_unitario, d.subtotal_linea, pr.imagen_url
         FROM detalle_pedido d
         LEFT JOIN productos pr ON pr.id_producto = d.id_producto
         WHERE d.id_pedido IN (?)
         ORDER BY d.id_detalle`,
        [pedidos.map((p) => p.id_pedido)]
      );

      res.json(pedidos.map((p) => ({
        ...p,
        items: detalle.filter((d) => d.id_pedido === p.id_pedido),
      })));
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'No se pudieron cargar tus pedidos' });
    }
  });
}

module.exports = { configurarPedidos };
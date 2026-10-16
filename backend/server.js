const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const pool = mysql.createPool({
  host: '127.0.0.1',
  port: 3307, // el puerto que cambiamos en el compose
  user: 'madatech',
  password: 'madatech1234',
  database: 'madatech',
});

// Devuelve los productos con el mismo formato que usa script.js:
// { id, name, category, price, rating, reviewsCount, image, description, specs, stock, brand }
app.get('/api/productos', async (req, res) => {
  try {
    const [productos] = await pool.query(`
      SELECT p.id_producto AS id,
             p.nombre AS name,
             c.nombre AS category,
             m.nombre AS brand,
             p.precio AS price,
             p.calificacion_prom AS rating,
             p.numero_resenas AS reviewsCount,
             p.imagen_url AS image,
             p.descripcion AS description,
             p.stock AS stock
      FROM productos p
      JOIN categorias c ON c.id_categoria = p.id_categoria
      JOIN marcas m ON m.id_marca = p.id_marca
      WHERE p.activo = TRUE
      ORDER BY p.id_producto
    `);

    const [specs] = await pool.query(`
      SELECT id_producto, especificacion
      FROM especificaciones_producto
      ORDER BY id_producto, orden
    `);

    const specsPorProducto = {};
    for (const s of specs) {
      (specsPorProducto[s.id_producto] ??= []).push(s.especificacion);
    }

    res.json(productos.map(p => ({
      ...p,
      price: Number(p.price),
      rating: Number(p.rating),
      specs: specsPorProducto[p.id] || [],
    })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al consultar productos' });
  }
});

app.listen(3000, () => console.log('API lista en http://localhost:3000'));
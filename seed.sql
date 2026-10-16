SET NAMES utf8mb4;
USE madatech;

-- Limpia los datos de prueba anteriores
SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE especificaciones_producto;
TRUNCATE TABLE imagenes_producto;
TRUNCATE TABLE productos;
TRUNCATE TABLE proveedores;
TRUNCATE TABLE marcas;
TRUNCATE TABLE categorias;
SET FOREIGN_KEY_CHECKS = 1;

-- Categorias (los nombres deben coincidir con los filtros de la pagina)
INSERT INTO categorias (id_categoria, nombre) VALUES
(1, 'Componentes'),
(2, 'Repuestos'),
(3, 'Accesorios'),
(4, 'Periféricos');

-- Marcas
INSERT INTO marcas (id_marca, nombre) VALUES
(1, 'Kingston'),
(2, 'AMD'),
(3, 'NVIDIA'),
(4, 'Samsung'),
(5, 'EVGA'),
(6, 'Redragon'),
(7, 'Logitech'),
(8, 'Genérica');

-- Proveedor
INSERT INTO proveedores (id_proveedor, nombre, rfc, correo, ciudad, pais, condiciones_pago_dias)
VALUES (1, 'Proveedor Demo', 'XAXX010101000', 'ventas@demo.com', 'Guadalajara', 'México', 30);

-- Productos
INSERT INTO productos
(id_producto, id_categoria, id_marca, id_proveedor, nombre, precio, stock, descripcion, imagen_url, calificacion_prom, numero_resenas)
VALUES
(1, 1, 1, 1, 'Memoria RAM 16GB DDR4 3200MHz', 1199.00, 30,
 'Memoria de alto rendimiento con disipador térmico para multitarea escolar y profesional sin interrupciones.',
 'img/ram.jpg', 4.8, 142),
(2, 1, 2, 1, 'Procesador AMD Ryzen 5 5600G', 2899.00, 15,
 'Procesador de 6 núcleos con gráficos integrados Radeon Vega, ideal para productividad y entretenimiento.',
 'img/cpu.jpg', 4.9, 230),
(3, 1, 3, 1, 'Tarjeta Gráfica NVIDIA RTX 3060 12GB', 6499.00, 8,
 'Potencia gráfica avanzada para diseño profesional, renderizado 3D y juegos con Ray Tracing.',
 'img/gpu.jpg', 4.9, 310),
(4, 1, 4, 1, 'Disco Duro SSD M.2 NVMe 1TB', 1450.00, 25,
 'Velocidades de lectura ultrarrápidas de hasta 3500 MB/s para iniciar tu sistema en segundos.',
 'img/ssd.jpg', 4.7, 98),
(5, 2, 5, 1, 'Fuente de Poder 650W 80+ Bronze', 1299.00, 20,
 'Energía estable y segura con certificación 80 Plus Bronze para proteger todos tus componentes.',
 'img/psu.jpg', 4.6, 75),
(6, 4, 6, 1, 'Teclado Mecánico RGB Compacto TKL', 899.00, 35,
 'Teclado mecánico con switches táctiles y retroiluminación RGB personalizable para escritura fluida.',
 'img/teclado.jpg', 4.8, 420),
(7, 4, 7, 1, 'Mouse Ergonómico Inalámbrico Óptico', 499.00, 40,
 'Diseño ergonómico avanzado para reducir la fatiga en jornadas prolongadas de estudio y trabajo.',
 'img/mouse.jpg', 4.7, 180),
(8, 3, 8, 1, 'Funda Protectora para Laptop 15.6"', 349.00, 50,
 'Protección impermeable con forro de terciopelo interior y bolsillo frontal para accesorios.',
 'img/funda.jpg', 4.5, 64),
(9, 2, 8, 1, 'Pasta Térmica de Alto Rendimiento', 199.00, 60,
 'Compuesto térmico de jeringa para mantener tu procesador y tarjeta gráfica a temperaturas óptimas.',
 'img/pasta.jpg', 4.9, 312),
(10, 2, 8, 1, 'Batería de Repuesto para Laptop Estándar', 850.00, 12,
 'Batería de repuesto compatible con múltiples modelos, celdas de ion de litio de larga duración.',
 'img/bateria.jpg', 4.6, 52),
(11, 3, 8, 1, 'Hub USB-C 7 en 1 Multi-puerto', 599.00, 30,
 'Extiende la conectividad de tu laptop con puertos HDMI 4K, USB 3.0, lectores SD y carga Power Delivery.',
 'img/hub.jpg', 4.8, 190),
(12, 4, 6, 1, 'Auriculares Gamer con Micrófono y LED', 799.00, 25,
 'Sonido envolvente estéreo con almohadillas acolchadas y micrófono con cancelación de ruido.',
 'img/auriculares.jpg', 4.7, 215);

-- Especificaciones
INSERT INTO especificaciones_producto (id_producto, especificacion, orden) VALUES
(1, 'Capacidad: 16GB', 1),
(1, 'Tipo: DDR4', 2),
(1, 'Velocidad: 3200MHz', 3),
(1, 'Disipador de aluminio', 4),
(2, 'Núcleos: 6 / Hilos: 12', 1),
(2, 'Gráficos Radeon Vega 7', 2),
(2, 'Socket AM4', 3),
(3, 'VRAM: 12GB GDDR6', 1),
(3, 'Ray Tracing Cores', 2),
(3, 'DLSS 2.0', 3),
(4, 'Capacidad: 1TB', 1),
(4, 'Lectura hasta: 3500 MB/s', 2),
(4, 'Factor de forma: M.2 2280', 3),
(5, 'Potencia: 650W', 1),
(5, 'Certificación: 80 Plus Bronze', 2),
(6, 'Switches mecánicos', 1),
(6, 'Iluminación RGB por tecla', 2),
(7, 'Sensor óptico de alta precisión', 1),
(7, 'Batería recargable USB-C', 2),
(8, 'Compatible hasta 15.6 pulgadas', 1),
(8, 'Material impermeable', 2),
(9, 'Contenido: Jeringa de 4g', 1),
(9, 'Alta conductividad térmica', 2),
(10, 'Tecnología Li-Ion', 1),
(10, 'Protección contra sobrecarga', 2),
(11, 'Salida HDMI 4K@30Hz', 1),
(11, 'Puertos USB 3.0 de alta velocidad', 2),
(12, 'Drivers de 50mm', 1),
(12, 'Micrófono omnidireccional flexible', 2);
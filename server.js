const express = require('express');
const bodyParser = require('body-parser');
const cassandra = require('cassandra-driver');
const { MongoClient } = require('mongodb');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.json());
app.use(express.static('public'));

// Configuración de Cassandra
const cassandraClient = new cassandra.Client({
  contactPoints: [process.env.CASSANDRA_HOST || 'localhost'],
  localDataCenter: process.env.CASSANDRA_DATACENTER || 'datacenter1',
  keyspace: process.env.CASSANDRA_KEYSPACE || 'system'
});

// Configuración de MongoDB
let mongoClient;
const mongoUrl = process.env.MONGODB_URL || 'mongodb://localhost:27017';

// Conectar a MongoDB
async function connectMongoDB() {
  try {
    mongoClient = new MongoClient(mongoUrl);
    await mongoClient.connect();
    console.log('Conectado a MongoDB');
  } catch (error) {
    console.error('Error conectando a MongoDB:', error);
  }
}

// Rutas de la API

// Ejecutar consulta en Cassandra
app.post('/api/execute/cassandra', async (req, res) => {
  const { query } = req.body;
  
  if (!query) {
    return res.status(400).json({ error: 'La consulta no puede estar vacía' });
  }

  try {
    const result = await cassandraClient.execute(query);
    res.json({
      success: true,
      data: result.rows,
      columns: result.columns,
      rowCount: result.rowLength
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Ejecutar consulta en MongoDB
app.post('/api/execute/mongodb', async (req, res) => {
  const { query } = req.body;
  
  if (!query) {
    return res.status(400).json({ error: 'La consulta no puede estar vacía' });
  }

  try {
    // Parsear el script de MongoDB
    const script = eval(`(${query})`);
    
    if (typeof script !== 'function') {
      throw new Error('El script debe ser una función');
    }

    // Ejecutar el script pasando la base de datos como parámetro
    const db = mongoClient.db(process.env.MONGODB_DB || 'test');
    const result = await script(db);
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Iniciar servidor
async function startServer() {
  await connectMongoDB();
  
  app.listen(port, () => {
    console.log(`Servidor ejecutándose en http://localhost:${port}`);
  });
}

startServer().catch(console.error);
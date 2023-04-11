const {
    createBot,
    createProvider,
    createFlow,
    addKeyword,
} = require('@bot-whatsapp/bot')

const axios = require('axios');
const cheerio = require('cheerio');
const QRPortalWeb = require('@bot-whatsapp/portal')
const BaileysProvider = require('@bot-whatsapp/provider/baileys')
const MockAdapter = require('@bot-whatsapp/database/mock')

async function buscarProducto(producto) {
  const urlBusqueda = `https://surtihogareselmana.com/?s=${producto}`;
  const response = await axios.get(urlBusqueda);
  const $ = cheerio.load(response.data);

  const productos = $('div.entry-thumb.single-thumb');
  const resultados = [];

  for (let i = 0; i < productos.length; i++) {
    const enlace = $(productos[i]).find('a').attr('href');
    const detalles = await axios.get(enlace);
    const $detalles = cheerio.load(detalles.data);
    const titulo = $detalles('h1[itemprop="name"].product_title.entry-title').text();
    const precio = $detalles('span.price-amount').text();
    resultados.push({ titulo, precio, enlace });
  }

  return resultados;
}

const flowBuscarProducto = addKeyword(['buscar'])
  .addAnswer('Por favor, escribe el nombre del producto que deseas buscar:')
  .addAnswer(async (ctx) => {
    const producto = ctx.answer;
    console.log('Producto buscado:', producto);

    const resultados = await buscarProducto(producto);
    console.log('Resultados:', resultados);

    let respuesta = '';

    resultados.forEach((resultado) => {
      console.log('Resultado:', resultado);
      respuesta += `Título: ${resultado.titulo}\nPrecio: ${resultado.precio}\nEnlace: ${resultado.enlace}\n\n`;
    });

    console.log('Respuesta:', respuesta);
    return respuesta;
  });


const flowPrincipal = addKeyword(['hola', 'ole', 'alo'])
    .addAnswer('🙌 Hola, que gusto atenderte en Surtihogares el Manáa')
    .addAnswer(
        [
            '👉 Para buscar un Producto en nuestra tienda Escribe *Buscar*',
        ],
        null,
        null,
        [flowBuscarProducto]
    )



const main = async () => {
    const adapterDB = new MockAdapter()
    const adapterFlow = createFlow([flowPrincipal])
    const adapterProvider = createProvider(BaileysProvider)

    createBot({
        flow: adapterFlow,
        provider: adapterProvider,
        database: adapterDB,
    })

    QRPortalWeb()
}

main()

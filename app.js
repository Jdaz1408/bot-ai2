const {
  createBot,
  createProvider,
  createFlow,
  addKeyword,
} = require('@bot-whatsapp/bot');
const axios = require('axios');
const cheerio = require('cheerio');
const QRPortalWeb = require('@bot-whatsapp/portal');
const BaileysProvider = require('@bot-whatsapp/provider/baileys');
const MockAdapter = require('@bot-whatsapp/database/mock');

const Typo = require('typo-js');
const dictionary = new Typo('es_ES'); 

let resultadosBusqueda = [];
let indiceResultadoActual = 0;

async function buscar_producto(producto) {
  const productoCorregido = dictionary.check(producto) ? producto : dictionary.suggest(producto)[0];

  const url_busqueda = 'https://surtihogareselmana.com/?s=' + productoCorregido;
  const response = await axios.get(url_busqueda);
  const resultados = [];

  if (response.status === 200) {
    const $ = cheerio.load(response.data);
    const productos = $('div.entry-thumb.single-thumb');

    for (let i = 0; i < productos.length; i++) {
      const enlace = productos.eq(i).find('a').attr('href');
      const detalles = await axios.get(enlace);
      if (detalles.status === 200) {
        const $detalles = cheerio.load(detalles.data);
        const detalles_producto = $detalles('div.summary.entry-summary');
        const titulo_element = detalles_producto.find('h1[itemprop="name"].product_title.entry-title');
        const precio_element = detalles_producto.find('span.woocommerce-Price-amount.amount');
        const precio = precio_element.text() || 'Precio no disponible';

        resultados.push({
          titulo: titulo_element.text().trim(),
          precio: precio,
          enlace: enlace,
        });
      }
    }
  }

  return resultados;
}


const flowBuscarProducto = addKeyword(['buscar'])
  .addAnswer('🔍 Por favor, dime el nombre del producto que estás buscando:', { capture: true }, async (ctx,{flowDynamic}) => {
    console.log('Producto capturado:', ctx.body);
    
    setTimeout(async () => {
      flowDynamic({body:'Estoy buscando opciones...'})
      const resultados = await buscar_producto(ctx.body);
      if (resultados && resultados.length > 0) {
        resultadosBusqueda = resultados;
        indiceResultadoActual = 1;
        flowDynamic(`Hoy te recomiendo:\n\nProducto: ${resultados[0].titulo}\nPrecio: ${resultados[0].precio}\nEnlace: ${resultados[0].enlace}\n\nTe invito a buscar más opciones en nuestra web: https://surtihogareselmana.com`);
      } else {
        flowDynamic('Lo siento, no he encontrado resultados para tu búsqueda.');
      }
    }, 1500);
  });


const flowPrincipal = addKeyword(['hola', 'ole', 'alo'])
  .addAnswer('🙌 Hola, que gusto atenderte en Surtihogares el Maná')
  .addAnswer(
    [
      '👉 Para buscar un Producto en nuestra tienda Escribe *Buscar*',
    ],
    null,
    null,
    [flowBuscarProducto]
  );

const main = async () => {
  const adapterDB = new MockAdapter();
  const adapterFlow = createFlow([flowPrincipal,flowBuscarProducto]);
  const adapterProvider = createProvider(BaileysProvider);

  createBot({
    flow: adapterFlow,
    provider: adapterProvider,
    database: adapterDB,
  });

  QRPortalWeb();
};

main();

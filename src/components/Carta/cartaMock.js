// Datos de ejemplo SOLO para desarrollo (VITE_CARTA_MOCK=1).
// Misma forma que la respuesta de `agent-carta` v1. No entra en el build de produccion.
import pulpo from '../../img/pulpo.png'
import carne from '../../img/foto_carne.png'

const expira = new Date(Date.now() + 12 * 3600 * 1000).toISOString()
const glb = 'https://modelviewer.dev/shared-assets/models/Astronaut.glb'

const plato = (id, name, description, price_cents, allergens = [], extra = {}) => ({
  id: `p${id}`,
  name,
  description,
  price_cents,
  price_text: price_cents == null ? null : `${(price_cents / 100).toFixed(2).replace('.', ',')} €`,
  allergens,
  allergens_verified: false,
  images: [],
  model_3d: null,
  ...extra,
})

export default {
  ok: true,
  version: 1,
  generated_at: new Date().toISOString(),
  urls_expire_at: expira,
  restaurant: { id: 3, name: 'Restaurante Néboa' },
  cartas: [
    {
      id: 'c1',
      name: 'CARTA RESTAURANTE NEBOA',
      kind: 'carta',
      updated_at: new Date().toISOString(),
      pdf_url: null,
      source_kind: 'pdf',
      secciones: [
        {
          id: null, origen: 'seccion', name: 'Entrantes', description: null, position: 0,
          platos: [
            plato(1, 'Pulpo á feira', 'Pulpo gallego cocido con aceite de oliva, sal gruesa y pimentón de la Vera.', 1850, ['moluscos'], {
              images: [{ url: pulpo, position: 0 }],
              model_3d: { glb_url: glb, preview_url: null, version: 2 },
            }),
            plato(2, 'Croquetas caseras de jamón', 'Ocho unidades, cremosas por dentro.', 1100, ['gluten', 'leche', 'huevo']),
            plato(3, 'Pimientos de Padrón', null, 850, []),
            plato(4, 'Zamburiñas a la plancha', 'Según mercado.', null, ['moluscos']),
          ],
        },
        {
          id: null, origen: 'seccion', name: 'Platos principales', description: 'Carnes de vacuno gallego a la brasa.', position: 1,
          platos: [
            plato(5, 'Chuletón de vaca gallega', 'Madurado 45 días, 1 kg aprox. Con patatas y pimientos.', 5500, [], {
              images: [{ url: carne, position: 0 }],
            }),
            plato(6, 'Lacón con grelos', 'Plato tradicional con cachelos y chorizo.', 1650, ['sulfitos'], {
              model_3d: { glb_url: glb, preview_url: carne, version: 1 },
            }),
            plato(7, 'Merluza a la gallega con un nombre bastante largo para probar el ajuste', 'Con ajada, cachelos y un toque de pimentón.', 1900, ['pescado']),
          ],
        },
        {
          id: null, origen: 'seccion', name: 'Para terminar', description: null, position: 2,
          platos: [
            plato(8, 'Tarta de queso', null, 650, ['leche', 'huevo', 'gluten']),
            plato(9, 'Filloas con crema', 'Receta de la abuela.', 600, ['gluten', 'leche', 'huevo']),
          ],
        },
      ],
    },
  ],
  menu_del_dia: {
    id: 'm1',
    name: 'Menú del día',
    kind: 'menu_dia',
    valid_from: new Date().toISOString(),
    valid_to: new Date().toISOString(),
    origen: 'vigente',
    updated_at: new Date().toISOString(),
    pdf_url: null,
    source_kind: 'text',
    secciones: [
      {
        id: null, origen: 'seccion', name: 'Primeros', description: null, position: 0,
        platos: [plato(20, 'Caldo gallego', null, null), plato(21, 'Ensalada mixta', null, null)],
      },
      {
        id: null, origen: 'seccion', name: 'Segundos', description: null, position: 1,
        platos: [plato(22, 'Raxo con patatas', null, null), plato(23, 'Bacalao al horno', null, null, ['pescado'])],
      },
      {
        id: null, origen: 'seccion', name: 'Precio', description: 'Incluye pan, bebida y postre o café.', position: 2,
        platos: [plato(24, 'Menú completo', null, 1400)],
      },
    ],
  },
}

import fotoCarne from '../../img/foto_carne.png'
import pulpo from '../../img/pulpo.png'
import './Nosotros.css'

const Nosotros = () => {
  return (
    <section id="nosotros" className="nosotros-section">
      <div className="nosotros-images">
        <img src={fotoCarne} alt="Productos gallegos" />
        <img src={pulpo} alt="Nuestros productos" />
      </div>
      <div className="nosotros-content">
        <h2>SOBRE NOSOTROS</h2>
        <p>
          El restaurante Néboa se encuentra ubicado en el número 21 de la calle Valle Inclán en Ourense, 
          trasladándose desde la Ribeira Sacra al centro de la ciudad para ampliar la oferta gastronómica 
          en una de las calles con mayor variedad de la ciudad.
        </p>
        <p>
          Fundado por Estéfano Varela, el restaurante se centra en una cocina tradicional gallega con 
          materia prima de primer nivel, modernizada en sus elaboraciones. La carta se adapta a la temporada, 
          ofreciendo platos más frescos en verano y recetas estrella como el cocido en invierno.
        </p>
        <p>
          Destacan nuestras carnes de raza rubia gallega, con algún aporte de Angus y buey, servidas en 
          cortes como entrecot o chuletón, con un especialista dedicado exclusivamente a su corte. Además, 
          incluimos productos gallegos como quesos de Airas Moniz, O Rexo o O Cebreiro.
        </p>
      </div>
    </section>
  )
}

export default Nosotros

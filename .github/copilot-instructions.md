# Instrucciones para GitHub Copilot - Proyecto Néboa

## Descripción del Proyecto

Landing page profesional para el **Restaurante Néboa**, ubicado en Ourense. El restaurante ofrece gastronomía tradicional gallega con materia prima de primer nivel, modernizada en sus elaboraciones. Fundado por Estéfano Varela.

## Información del Restaurante

- **Nombre**: Néboa Restaurante
- **Ubicación**: Calle Valle Inclán, 21 - Ourense
- **Teléfono/WhatsApp**: 630 713 713
- **Instagram**: @restauranteneboaourense
- **Especialidades**: Carnes de raza rubia gallega, Angus y buey, quesos gallegos, pulpo a la brasa, risotto de shiitake

## Tecnologías

- **React 19** - Componentes de UI
- **Vite 7** - Build tool
- **CSS3** - Estilos personalizados (sin frameworks)
- **JavaScript ES6+**

## Estructura del Proyecto

```
src/
├── App.jsx              # Componente principal con todas las secciones
├── App.css              # Estilos principales
├── index.css            # Estilos globales
├── main.jsx             # Punto de entrada
├── img/                 # Imágenes y PDFs de cartas
│   ├── logo_neboa.jpg
│   ├── neboa_profile.png
│   ├── carta_*.pdf      # Cartas del restaurante
│   ├── foto_*.jpg/png   # Fotos del restaurante
│   └── horario.pdf
└── components/          # (Por crear) Componentes reutilizables
```

## Paleta de Colores

- Gris oscuro principal: `#4a4a4a`
- Gris más oscuro: `#3a3a3a`
- Gris muy oscuro: `#2a2a2a`
- Beige/Arena: `#c4b5a4`
- Beige claro: `#d4c5b4`
- Blanco: `#ffffff`
- Texto: `#333333`

## Secciones de la Landing

1. **Navbar** - Logo, navegación, iconos sociales (Instagram, WhatsApp)
2. **Hero** - Logo grande con efecto visual
3. **Bienvenida** - Texto de presentación
4. **Cartas** - Grid con 6 categorías (Desayunos, Carta, Tapas, Vinos, Spritz, Cócteles)
5. **Galerías** - 3 carruseles (Desayunos, Espacio, Especialidades)
6. **Eventos** - Sección para celebraciones
7. **Reservas** - Formulario con integración WhatsApp
8. **Sobre Nosotros** - Historia y descripción
9. **Equipo** - Foto del equipo
10. **Horario** - Tabla con horarios semanales
11. **Footer** - Contacto y redes sociales

## Funcionalidades Implementadas

- ✅ Carruseles automáticos con indicadores
- ✅ Formulario de reservas con validación de horarios
- ✅ Integración con WhatsApp para reservas
- ✅ PDFs de cartas que se abren en nueva pestaña
- ✅ Diseño 100% responsive
- ✅ Smooth scroll
- ✅ Menú hamburguesa para móvil
- ✅ Hovers y transiciones suaves

## Horarios del Restaurante

| Día | Mañana | Comidas | Tarde/Noche |
|-----|--------|---------|-------------|
| Lunes | 09:00-17:00 | 13:00-15:30 | Cerrado |
| Martes | 09:00-17:00 | 13:00-15:30 | Cerrado |
| Miércoles | **CERRADO** | **CERRADO** | **CERRADO** |
| Jueves | 09:00-17:00 | 13:00-15:30 | 20:00-01:00 |
| Viernes | 09:00-17:00 | 13:00-15:30 | 20:00-01:00 |
| Sábado | 12:00-17:00 | 13:00-15:30 | 20:00-01:00 |
| Domingo | 12:00-17:00 | 13:00-15:30 | Cerrado |

## Convenciones de Código

- **Componentes**: PascalCase (ej: `Header.jsx`)
- **Archivos de estilos**: Mismo nombre que el componente
- **Variables/funciones**: camelCase
- **Constantes**: UPPER_SNAKE_CASE
- **Formato**: 2 espacios de indentación

## Próximas Mejoras Sugeridas

- [ ] Animaciones al hacer scroll (Intersection Observer)
- [ ] Modo oscuro/claro
- [ ] Optimización de imágenes (WebP)
- [ ] Sistema de reseñas/testimonios
- [ ] Integración con Google Maps
- [ ] SEO avanzado (meta tags dinámicos)
- [ ] Analytics (Google Analytics)

## Notas Importantes

- No instalar dependencias adicionales sin justificación
- Mantener el proyecto ligero
- Preferir CSS puro sobre frameworks
- Asegurar responsividad en todos los dispositivos
- Los colores grises y beige son la identidad visual

---

Última actualización: 2 de enero de 2026

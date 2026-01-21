import { useInView } from 'react-intersection-observer'
import './ScrollReveal.css'

const ScrollReveal = ({ 
  children, 
  animation = 'fade-up',
  delay = 0,
  duration = 0.6,
  threshold = 0.1,
  triggerOnce = true
}) => {
  const { ref, inView } = useInView({
    threshold,
    triggerOnce,
    rootMargin: '-50px 0px'
  })

  return (
    <div
      ref={ref}
      className={`scroll-reveal ${animation} ${inView ? 'is-visible' : ''}`}
      style={{
        transitionDelay: `${delay}s`,
        transitionDuration: `${duration}s`
      }}
    >
      {children}
    </div>
  )
}

export default ScrollReveal

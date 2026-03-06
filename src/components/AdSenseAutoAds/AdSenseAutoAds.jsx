import { useEffect } from 'react'

const ADSENSE_SCRIPT_BASE = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js'

function AdSenseAutoAds() {
  const clientId = import.meta.env.VITE_GOOGLE_ADSENSE_CLIENT

  useEffect(() => {
    if (!clientId) {
      return
    }

    if (window.__neboaAdsenseInitialized) {
      return
    }

    const scriptSrc = `${ADSENSE_SCRIPT_BASE}?client=${clientId}`
    let script = document.querySelector(`script[src="${scriptSrc}"]`)

    const initAutoAds = () => {
      try {
        ;(window.adsbygoogle = window.adsbygoogle || []).push({
          google_ad_client: clientId,
          enable_page_level_ads: true
        })
        window.__neboaAdsenseInitialized = true
      } catch {
        // AdSense puede bloquearse en local/adblockers; no rompemos la UI.
      }
    }

    if (!script) {
      script = document.createElement('script')
      script.async = true
      script.src = scriptSrc
      script.crossOrigin = 'anonymous'
      script.addEventListener('load', initAutoAds)
      document.head.appendChild(script)
    } else {
      initAutoAds()
    }

    return () => {
      script?.removeEventListener?.('load', initAutoAds)
    }
  }, [clientId])

  return null
}

export default AdSenseAutoAds

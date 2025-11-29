"use client"

import { useEffect, useRef } from "react"

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  maxLife: number
  size: number
  angle: number
  distance: number
}

const MESSAGES = [
  "a universe of ideas waiting to be explored",
  "A constellation of thoughts waiting to be connected",
  "A galaxy of life spiraling forward",
]

export default function BlackHoleSimulation() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const mouseRef = useRef({ x: 0, y: 0, isHovering: false })
  const displayedTextRef = useRef("")
  const textStateRef = useRef<"idle" | "typing" | "visible">("idle")
  const typingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const delayTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const visibilityTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Set canvas size to full window
    const resizeCanvas = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resizeCanvas()
    window.addEventListener("resize", resizeCanvas)

    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current.x = e.clientX
      mouseRef.current.y = e.clientY
      mouseRef.current.isHovering = true
    }

    const handleMouseLeave = () => {
      mouseRef.current.isHovering = false
    }

    canvas.addEventListener("mousemove", handleMouseMove)
    canvas.addEventListener("mouseleave", handleMouseLeave)

    const blackHole = {
      x: canvas.width / 2,
      y: canvas.height / 2,
      mass: 3000,
      radius: 40,
      eventHorizonRadius: 70,
    }

    // Particles array
    const particles: Particle[] = []
    const maxParticles = 400

    // Create initial particles
    for (let i = 0; i < maxParticles; i++) {
      createParticle()
    }

    function createParticle() {
      const angle = Math.random() * Math.PI * 2
      const distance = Math.random() < 0.6 ? 100 + Math.random() * 250 : 400 + Math.random() * 600
      const x = blackHole.x + Math.cos(angle) * distance
      const y = blackHole.y + Math.sin(angle) * distance

      // Orbital velocity
      const speed = Math.sqrt(blackHole.mass / distance) * 0.8
      const vx = -Math.sin(angle) * speed + (Math.random() - 0.5) * 0.5
      const vy = Math.cos(angle) * speed + (Math.random() - 0.5) * 0.5

      particles.push({
        x,
        y,
        vx,
        vy,
        life: 1,
        maxLife: 1,
        size: 0.5 + Math.random() * 1,
        angle,
        distance,
      })
    }

    let lastFrameTime = 0
    const frameDelay = 1000 / 30 // 30 FPS instead of 60 FPS

    function animate(currentTime: number) {
      // Frame rate limiting for reduced CPU usage
      if (currentTime - lastFrameTime < frameDelay) {
        requestAnimationFrame(animate)
        return
      }
      lastFrameTime = currentTime

      ctx.fillStyle = "rgba(0, 0, 0, 0.2)"
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      // Update black hole position on resize
      blackHole.x = canvas.width / 2
      blackHole.y = canvas.height / 2

      const gradient = ctx.createRadialGradient(
        blackHole.x,
        blackHole.y,
        0,
        blackHole.x,
        blackHole.y,
        blackHole.eventHorizonRadius,
      )
      gradient.addColorStop(0, "rgba(255, 255, 255, 0.05)")
      gradient.addColorStop(0.5, "rgba(255, 255, 255, 0.02)")
      gradient.addColorStop(1, "rgba(255, 255, 255, 0)")
      ctx.fillStyle = gradient
      ctx.beginPath()
      ctx.arc(blackHole.x, blackHole.y, blackHole.eventHorizonRadius, 0, Math.PI * 2)
      ctx.fill()

      // Draw black hole core
      ctx.fillStyle = "#000000"
      ctx.beginPath()
      ctx.arc(blackHole.x, blackHole.y, blackHole.radius, 0, Math.PI * 2)
      ctx.fill()

      // Draw text inside black hole if there's text to display
      // Draw BEFORE particles to ensure it's visible
      if (displayedTextRef.current && textStateRef.current !== "idle") {
        ctx.save()
        // Use a more reliable font stack with better fallbacks for canvas
        ctx.font = '12px "Geist Mono", "SF Mono", "Monaco", "Consolas", "Courier New", monospace'
        ctx.fillStyle = "rgba(255, 255, 255, 0.95)"
        ctx.textAlign = "center"
        ctx.textBaseline = "middle"
        
        // Add subtle shadow for better visibility against black background
        ctx.shadowColor = "rgba(255, 255, 255, 0.6)"
        ctx.shadowBlur = 5
        
        // Draw text - make sure it's definitely visible
        ctx.fillText(displayedTextRef.current, blackHole.x, blackHole.y)
        ctx.restore()
      }

      // Update and draw particles
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i]

        // Calculate distance to black hole
        const dx = blackHole.x - p.x
        const dy = blackHole.y - p.y
        const dist = Math.sqrt(dx * dx + dy * dy)

        const maxViewportDist = Math.sqrt(canvas.width * canvas.width + canvas.height * canvas.height) / 2
        const viewportCenterDist = Math.sqrt(Math.pow(p.x - canvas.width / 2, 2) + Math.pow(p.y - canvas.height / 2, 2))
        const edgeFade = Math.max(0.15, 1 - (viewportCenterDist / maxViewportDist) * 1.5)

        if (mouseRef.current.isHovering) {
          const mdx = p.x - mouseRef.current.x
          const mdy = p.y - mouseRef.current.y
          const mouseDist = Math.sqrt(mdx * mdx + mdy * mdy)

          // Apply repulsion force when cursor is close to particles
          if (mouseDist < 120) {
            const repulsionStrength = (120 - mouseDist) / 120
            const repulsionForce = repulsionStrength * 0.8
            p.vx += (mdx / mouseDist) * repulsionForce
            p.vy += (mdy / mouseDist) * repulsionForce
          }
        }

        if (dist > 0.1) {
          const force = blackHole.mass / (dist * dist)
          const fx = (dx / dist) * force
          const fy = (dy / dist) * force

          p.vx += fx * 0.008
          p.vy += fy * 0.008
        }

        p.vx *= 0.995
        p.vy *= 0.995

        // Update position
        p.x += p.vx
        p.y += p.vy

        // Check if particle is absorbed by black hole
        if (dist < blackHole.eventHorizonRadius) {
          p.life -= 0.05

          // Create accretion disk effect
          if (dist > blackHole.radius && Math.random() > 0.7) {
            const angle = Math.atan2(dy, dx)
            const perpAngle = angle + Math.PI / 2
            p.vx += Math.cos(perpAngle) * 0.5
            p.vy += Math.sin(perpAngle) * 0.5
          }
        }

        // Remove dead particles
        if (p.life <= 0 || dist < blackHole.radius) {
          particles.splice(i, 1)
          createParticle()
          continue
        }

        // Remove particles that go off screen
        if (p.x < -100 || p.x > canvas.width + 100 || p.y < -100 || p.y > canvas.height + 100) {
          particles.splice(i, 1)
          createParticle()
          continue
        }

        const brightness = Math.min(1, dist / 200)
        const alpha = p.life * brightness * edgeFade

        // Draw particle
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
        ctx.fill()

        if (dist < blackHole.eventHorizonRadius * 1.2) {
          ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.15})`
          ctx.beginPath()
          ctx.arc(p.x, p.y, p.size * 2, 0, Math.PI * 2)
          ctx.fill()
        }
      }


      requestAnimationFrame(animate)
    }

    requestAnimationFrame(animate)

    return () => {
      window.removeEventListener("resize", resizeCanvas)
      canvas.removeEventListener("mousemove", handleMouseMove)
      canvas.removeEventListener("mouseleave", handleMouseLeave)
      if (typingIntervalRef.current) {
        clearInterval(typingIntervalRef.current)
      }
      if (delayTimeoutRef.current) {
        clearTimeout(delayTimeoutRef.current)
      }
      if (visibilityTimeoutRef.current) {
        clearTimeout(visibilityTimeoutRef.current)
      }
    }
  }, [])

  // Initialize message selection and timing
  useEffect(() => {
    // Randomly select a message
    const selectedMessage = MESSAGES[Math.floor(Math.random() * MESSAGES.length)]
    console.log("Black hole text: Selected message:", selectedMessage)

    // Set initial delay before starting typing
    console.log("Black hole text: Setting up 3 second delay...")
    delayTimeoutRef.current = setTimeout(() => {
      console.log("Black hole text: Delay complete, starting typing animation")
      textStateRef.current = "typing"
      displayedTextRef.current = ""
      
      // Start typing animation
      let currentIndex = 0
      typingIntervalRef.current = setInterval(() => {
        if (currentIndex < selectedMessage.length) {
          displayedTextRef.current = selectedMessage.slice(0, currentIndex + 1)
          console.log("Black hole text: Updating text:", displayedTextRef.current, "State:", textStateRef.current)
          currentIndex++
        } else {
          // Typing complete
          console.log("Black hole text: Typing complete")
          if (typingIntervalRef.current) {
            clearInterval(typingIntervalRef.current)
            typingIntervalRef.current = null
          }
          textStateRef.current = "visible"
          
          // Keep text visible for 15+ seconds
          visibilityTimeoutRef.current = setTimeout(() => {
            console.log("Black hole text: Hiding text after visibility period")
            textStateRef.current = "idle"
            displayedTextRef.current = ""
          }, 15000)
        }
      }, 60) // 60ms per character for typing effect
    }, 3000) // 3 second initial delay for testing

    return () => {
      if (typingIntervalRef.current) {
        clearInterval(typingIntervalRef.current)
      }
      if (delayTimeoutRef.current) {
        clearTimeout(delayTimeoutRef.current)
      }
      if (visibilityTimeoutRef.current) {
        clearTimeout(visibilityTimeoutRef.current)
      }
    }
  }, [])

  return (
    <div className="fixed inset-0 bg-black overflow-hidden">
      <canvas ref={canvasRef} className="w-full h-full cursor-crosshair" />
      <div className="absolute top-8 left-1/2 -translate-x-1/2 text-white/50 text-sm font-mono pointer-events-none">
        BLACK HOLE SIMULATION
      </div>
    </div>
  )
}

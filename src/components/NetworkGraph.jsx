import { useEffect, useRef } from 'react'
import * as d3 from 'd3'

const NODE_COLOR = '#c084fc'
const LINK_COLOR = 'white'
const LINK_OPACITY = 0.15
const GRAPH_OPACITY = 0.3
const FLOAT_AMPLITUDE = 5
const FLOAT_SPEED = 0.0008

function randomInRange(min, max) {
  return min + Math.random() * (max - min)
}

function randomInt(min, max) {
  return Math.floor(min + Math.random() * (max - min + 1))
}

function generateNodes() {
  const count = randomInt(18, 22)
  const nodes = []
  const anchorIdx = Math.floor(Math.random() * count)
  const mediumCount = randomInt(2, 3)
  const mediumIndices = new Set()
  while (mediumIndices.size < mediumCount) {
    let i = Math.floor(Math.random() * count)
    if (i !== anchorIdx) mediumIndices.add(i)
  }

  for (let i = 0; i < count; i++) {
    let radius
    if (i === anchorIdx) {
      radius = randomInRange(20, 24)
    } else if (mediumIndices.has(i)) {
      radius = randomInRange(10, 14)
    } else {
      radius = randomInRange(4, 6)
    }
    nodes.push({
      id: i,
      radius,
    })
  }
  return nodes
}

function generateLinks(nodes) {
  const links = []
  const linkSet = new Set()
  const id = (a, b) => (a < b ? `${a}-${b}` : `${b}-${a}`)

  nodes.forEach((node, i) => {
    const numLinks = randomInt(2, 4)
    let attempts = 0
    let added = 0
    while (added < numLinks && attempts < 20) {
      const j = Math.floor(Math.random() * nodes.length)
      if (j === i) {
        attempts++
        continue
      }
      const key = id(i, j)
      if (!linkSet.has(key)) {
        linkSet.add(key)
        links.push({ source: i, target: j })
        added++
      }
      attempts++
    }
  })
  return links
}

export default function NetworkGraph() {
  const containerRef = useRef(null)
  const svgRef = useRef(null)
  const simulationRef = useRef(null)
  const nodesRef = useRef([])
  const linksRef = useRef([])
  const rafRef = useRef(null)
  const startTimeRef = useRef(null)
  const draggedNodeRef = useRef(null)

  useEffect(() => {
    const container = containerRef.current
    const svgEl = svgRef.current
    if (!container || !svgEl) return

    const width = container.clientWidth
    const height = container.clientHeight

    const nodes = generateNodes().map((d) => ({
      ...d,
      x: width / 2 + (Math.random() - 0.5) * width * 1.0,
      y: height / 2 + (Math.random() - 0.5) * height * 1.0,
    }))
    const links = generateLinks(nodes)

    nodesRef.current = nodes
    linksRef.current = links

    d3.select(svgEl).selectAll('*').remove()
    const svg = d3.select(svgEl).attr('width', width).attr('height', height)

    const link = svg
      .append('g')
      .selectAll('line')
      .data(links)
      .join('line')
      .attr('stroke', LINK_COLOR)
      .attr('stroke-opacity', LINK_OPACITY)
      .attr('stroke-width', 1)

    const node = svg
      .append('g')
      .selectAll('circle')
      .data(nodes)
      .join('circle')
      .attr('r', (d) => d.radius)
      .attr('fill', NODE_COLOR)
      .style('cursor', 'grab')
      .style('pointer-events', 'all')
      .call(
        d3
          .drag()
          .on('start', (event, d) => {
            draggedNodeRef.current = d
            node.style('cursor', 'grabbing')
          })
          .on('drag', (event, d) => {
            d.x = event.x
            d.y = event.y
          })
          .on('end', () => {
            draggedNodeRef.current = null
            node.style('cursor', 'grab')
          })
      )

    const simulation = d3
      .forceSimulation(nodes)
      .force(
        'link',
        d3.forceLink(links).id((d) => d.id).distance(80)
      )
      .force('charge', d3.forceManyBody().strength(-120))
      .force('center', d3.forceCenter(width / 2, height / 2).strength(0.05))
      .force(
        'collision',
        d3.forceCollide().radius((d) => d.radius + 4)
      )

    simulationRef.current = simulation

    startTimeRef.current = performance.now()
    function float() {
      const t = (performance.now() - startTimeRef.current) * FLOAT_SPEED
      const nodes = nodesRef.current
      if (!nodes.length) return

      const getNode = (s) => (typeof s === 'object' ? s : nodes[s])
      const dragged = draggedNodeRef.current
      const pos = (n, i) =>
        n === dragged
          ? { x: n.x, y: n.y }
          : {
              x: n.x + FLOAT_AMPLITUDE * Math.sin(t + i * 0.7),
              y: n.y + FLOAT_AMPLITUDE * Math.cos(t + i * 0.5),
            }
      link
        .attr('x1', (d) => { const n = getNode(d.source); return pos(n, n.id).x })
        .attr('y1', (d) => { const n = getNode(d.source); return pos(n, n.id).y })
        .attr('x2', (d) => { const n = getNode(d.target); return pos(n, n.id).x })
        .attr('y2', (d) => { const n = getNode(d.target); return pos(n, n.id).y })
      node.each(function (d, i) {
        const o = pos(d, i)
        d3.select(this).attr('cx', o.x).attr('cy', o.y)
      })
      rafRef.current = requestAnimationFrame(float)
    }
    rafRef.current = requestAnimationFrame(float)

    const resizeObserver = new ResizeObserver(() => {
      const w = container.clientWidth
      const h = container.clientHeight
      if (w <= 0 || h <= 0) return
      simulation.force('center', d3.forceCenter(w / 2, h / 2).strength(0.05))
      svg.attr('width', w).attr('height', h)
      simulation.alpha(0.3).restart()
    })
    resizeObserver.observe(container)

    return () => {
      resizeObserver.disconnect()
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      simulation.stop()
      simulationRef.current = null
    }
  }, [])

  return (
    <div
      ref={containerRef}
      style={{
        position: 'fixed',
        left: 0,
        top: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: 'transparent',
        pointerEvents: 'none',
      }}
    >
      <svg
        ref={svgRef}
        style={{ display: 'block', width: '100%', height: '100%', opacity: GRAPH_OPACITY }}
      />
    </div>
  )
}

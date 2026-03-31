import { motion } from 'framer-motion'

const ITEMS = [
  { label: 'BIO',     num: '01', href: '#bio',     colorClass: 'sm-item--yellow' },
  { label: 'MUSIC',   num: '02', href: '#music',   colorClass: 'sm-item--blue'   },
  { label: 'BOOKING', num: '03', href: '#booking', colorClass: 'sm-item--red'    },
  { label: 'EPK',     num: '04', href: 'epk.html', target: '_blank', colorClass: 'sm-item--grey' },
]

const ENTRANCE_DELAY = (i: number) => 0.8 + i * 0.45

interface Props {
  activeChannel: number
}

export default function SideMenu({ activeChannel }: Props) {
  return (
    <nav className="sm-root" aria-label="Site navigation">

      {/* ── program guide header ── */}
      <div className="sm-pg-header" aria-hidden="true">
        <span className="sm-pg-station">LONDON X</span>
        <span className="sm-pg-tag">P&nbsp;R&nbsp;E&nbsp;S&nbsp;E&nbsp;N&nbsp;T&nbsp;S</span>
        <div className="sm-pg-rule" />
      </div>

      {ITEMS.map(({ label, num, href, target, colorClass }, i) => (
        <div
          key={label}
          className={`sm-row${i === activeChannel ? ' sm-row--active' : ''}`}
        >
          {/* channel number + now-playing badge */}
          <div className="sm-row-meta" aria-hidden="true">
            <span className="sm-row-ch">CH {num}</span>
            <span className="sm-now">◉ NOW</span>
          </div>

          <motion.a
            href={href}
            target={target}
            rel={target ? 'noopener noreferrer' : undefined}
            className={`sm-item ${colorClass}${i === activeChannel ? ' sm-item--active' : ''}`}
            initial={{ opacity: 0, y: -28 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ scale: 1.03, transition: { duration: 0.18 } }}
            transition={{ duration: 1.1, delay: ENTRANCE_DELAY(i), ease: [0.22, 1, 0.36, 1] }}
          >
            {label}
          </motion.a>
        </div>
      ))}
    </nav>
  )
}

import { ArrowLeft, FileImage, FileJson, FolderOpen } from 'lucide-react'
import './Admin.css'

type AdminPanelProps = {
  onExit: () => void
}

export default function AdminPanel({ onExit }: AdminPanelProps) {
  return <section className="admin-page">
    <div className="admin-heading">
      <div>
        <div className="eyebrow"><span className="eyebrow-line" /> LOCAL FILE ARCHIVE</div>
        <h1>Moments, <em>in files.</em></h1>
        <p>This site reads a JSON file and image folder. It has no database or online editor.</p>
      </div>
      <button className="secondary-button" onClick={onExit}><ArrowLeft size={15} /> Back to game</button>
    </div>
    <div className="admin-content-grid">
      <div className="admin-list-card">
        <div className="admin-list-heading"><div><h2>Update the archive</h2><p>Change these files in the repository, then rebuild and publish the site.</p></div></div>
        <div className="admin-entry-list">
          <article className="admin-entry"><FileJson size={24} /><div className="admin-entry-info"><strong>public/data/challenges.json</strong><span>One object per game moment: title, clue, date, coordinates, description, and image filename.</span></div><a className="secondary-button" href={`${import.meta.env.BASE_URL}data/challenges.json`} target="_blank" rel="noreferrer">View JSON</a></article>
          <article className="admin-entry"><FolderOpen size={24} /><div className="admin-entry-info"><strong>public/images/</strong><span>Put approved JPG, PNG, WebP, or AVIF photos here. Set each JSON record’s image to a path such as images/welcome.jpg.</span></div><FileImage size={20} /></article>
        </div>
        <div className="admin-callout">The browser cannot save changes back into files on GitHub Pages. Edit the JSON and add images in VS Code or GitHub, commit those changes, then publish a fresh static build. Scores remain stored separately in each player’s browser.</div>
      </div>
      <aside className="admin-tips"><span className="admin-kicker">CONTENT CHECKLIST</span><h2>Before publishing</h2><ul><li>Use CSA-approved photos and event details.</li><li>Keep every image inside public/images/.</li><li>Use a unique id for each challenge.</li><li>Include at least five challenge objects.</li><li>Check all filenames and dates before building.</li></ul></aside>
    </div>
  </section>
}

import { Link } from "one";
import "./home.css";

export default function HomePage() {
  return (
    <div className="home-page" style={{ padding: 20 }}>
      <h1 id="page-title">Home Page</h1>
      <p id="home-text">Welcome to the CSS preload test</p>
      <Link href="/other" id="nav-to-other">
        Go to Other Page
      </Link>
    </div>
  );
}

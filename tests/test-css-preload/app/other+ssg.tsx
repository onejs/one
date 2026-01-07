import { Link } from "one";
import "./other.css";

export default function OtherPage() {
  return (
    <div className="other-page" style={{ padding: 20 }}>
      <h1 id="page-title">Other Page</h1>
      <p id="other-text">This is the other page</p>
      <Link href="/" id="nav-to-home">
        Go to Home Page
      </Link>
    </div>
  );
}

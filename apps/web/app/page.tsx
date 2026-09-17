import Link from "next/link";

export default function HomePage() {
  return (
    <>
      <h1>Study Assistant</h1>
      <p>
        CramRAG helps you ask questions, generate flashcards, and take quizzes
        grounded in your course notes.
      </p>
      <p>
        Phase 0 frontend shell is running. Use{" "}
        <Link href="/dev/status">API status</Link> to check connectivity to the
        backend when it is available.
      </p>
    </>
  );
}

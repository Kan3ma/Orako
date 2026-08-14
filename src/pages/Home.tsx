import { ArrowRight, Globe2, Layers3, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";

const Home = () => {
  return (
    <main className="min-h-screen bg-gradient-felt px-4 py-10 sm:px-6 sm:py-16">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-6xl flex-col justify-center">
        <header className="mb-10 text-center sm:mb-14">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-gold/30 bg-secondary/70 px-4 py-2 text-sm font-medium text-gold shadow-gold backdrop-blur">
            <Sparkles className="h-4 w-4" />
            Pick a game. Make your move.
          </div>
          <h1 className="text-5xl font-black tracking-[0.16em] text-gold sm:text-7xl">
            ORAKO
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-base text-foreground/70 sm:text-lg">
            A growing collection of simple games to play, challenge yourself,
            and share with friends.
          </p>
        </header>

        <section aria-labelledby="games-heading">
          <h2 id="games-heading" className="sr-only">
            Choose a game
          </h2>
          <div className="grid gap-5 md:grid-cols-3">
            <Link
              to="/njuka"
              className="group rounded-xl border border-gold/50 bg-secondary/95 p-1 shadow-deep transition-all duration-300 hover:-translate-y-1 hover:border-gold hover:shadow-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              <article className="flex h-full min-h-72 flex-col rounded-lg border border-border bg-background/45 p-7 backdrop-blur">
                <div className="mb-8 flex items-start justify-between">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-gold text-3xl font-black text-background shadow-gold">
                    N
                  </div>
                  <span className="rounded-full bg-gold px-3 py-1 text-xs font-bold uppercase tracking-wider text-background">
                    Play now
                  </span>
                </div>
                <div className="mt-auto">
                  <h3 className="text-3xl font-bold text-gold">Njuka</h3>
                  <p className="mt-2 text-sm leading-6 text-foreground/70">
                    Build the winning hand in this quick card game of pairs,
                    sequences, and perfectly timed claims.
                  </p>
                  <div className="mt-6 flex items-center gap-2 font-semibold text-gold">
                    Choose Njuka
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </div>
                </div>
              </article>
            </Link>

            <Link to="/country" className="group rounded-xl border border-gold/40 bg-secondary/90 p-1 shadow-deep transition-all hover:-translate-y-1 hover:border-gold hover:shadow-gold">
            <article className="flex min-h-72 flex-col rounded-lg border border-border bg-background/45 p-7 backdrop-blur">
              <div className="mb-8 flex items-start justify-between">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-gold/35 bg-background/60 text-gold">
                  <Globe2 className="h-8 w-8" />
                </div>
                <span className="rounded-full border border-gold/35 px-3 py-1 text-xs font-bold uppercase tracking-wider text-gold/80">
                  Multiplayer
                </span>
              </div>
              <div className="mt-auto">
                <h3 className="text-3xl font-bold text-gold">Country Game</h3>
                <p className="mt-2 text-sm leading-6 text-foreground/65">
                  Race the clock, compare answers, challenge your friends and top the leaderboard.
                </p>
                <div className="mt-6 flex items-center gap-2 font-semibold text-gold">Choose Country Game <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" /></div>
              </div>
            </article>
            </Link>

            <article className="flex min-h-72 flex-col items-center justify-center rounded-xl border border-dashed border-gold/35 bg-background/20 p-8 text-center backdrop-blur">
              <div className="flex h-16 w-16 items-center justify-center rounded-full border border-gold/30 bg-secondary/70 text-gold">
                <Layers3 className="h-8 w-8" />
              </div>
              <h3 className="mt-6 text-2xl font-bold text-gold">
                More games coming soon
              </h3>
              <p className="mt-3 max-w-xs text-sm leading-6 text-foreground/60">
                New ways to play will be added to the ORAKO collection.
              </p>
            </article>
          </div>
        </section>

        <footer className="mt-10 text-center text-xs uppercase tracking-[0.2em] text-foreground/35">
          The ORAKO game collection
        </footer>
      </div>
    </main>
  );
};

export default Home;

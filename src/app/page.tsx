import { Experience } from '@/components/Tour/Experience';
import { Footer } from '@/components/Footer/Footer';
import { Coda } from '@/components/Footer/Coda';

export default function Home() {
  return (
    <main id="tour" className="relative bg-void">
      <Experience />
      <Footer />
      <Coda />
    </main>
  );
}

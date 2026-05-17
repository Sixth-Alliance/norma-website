import FAQSection from "../components/landing-page/FAQSection";
import LocationSection from "../components/landing-page/LocationSection";
import StorySection from "../components/landing-page/StorySection";
import Headers from "../components/landing-page/Headers";
import Footer from "../components/landing-page/Footer";

export default function Home() {

  return (
    <>
      <main className="w-full">
        <Headers />
        <StorySection />
        <LocationSection />
        <FAQSection />
        <Footer />
      </main>
    </>
  );
}

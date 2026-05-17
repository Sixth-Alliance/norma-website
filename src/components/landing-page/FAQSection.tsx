"use client";
import { ChevronDown } from "lucide-react";
import { useState } from "react";

const FAQSection = () => {
  const [activeQuestion, setActiveQuestion] = useState(0);

  const faqData = [
    {
      question: "How do I place an order on Norma?",
      answer:
        "Ordering with Norma is simple and straightforward! Click 'Order Now' to begin, then select your preferred outlet from nearby locations. Browse our menu of fresh local favorites, add your chosen dishes to the cart, and proceed to checkout. After signing in to your account, choose your delivery method and complete your order. We'll take care of the rest – preparing your meal with care and delivering it hot, fresh, and right to your doorstep.",
    },
    {
      question: "Can I track my order after payment?",
      answer:
        "Yes, absolutely! Once your payment is confirmed, you can track your order in real-time directly from your account. Follow your food's journey from our kitchen to your location with live updates. You'll receive notifications when your order is being prepared, when it's out for delivery, and see an estimated arrival time so you know exactly when to expect your fresh meal.",
    },
    {
      question: "What payment options are available?",
      answer:
        "We offer multiple secure payment methods including credit cards, debit cards, and bank transfers. All online payments are protected with SSL encryption to ensure your financial information remains safe and secure throughout the transaction process.",
    },
    {
      question: "Can I save my details for next time?",
      answer:
        "Absolutely! When you sign in with email, your details are automatically saved for future orders. You can easily update your information anytime in your account settings. This makes reordering your favorite meals even quicker and more convenient.",
    },
    {
      question: "What if my outlet is unavailable?",
      answer:
        "If your preferred outlet is temporarily closed, simply use the outlet selection dropdown to browse other nearby locations. Our system will show you alternatives with similar menu options. You can also check back later when the outlet is available for business.",
    },
  ];

  const toggleQuestion = (index: number) => {
    setActiveQuestion(activeQuestion === index ? -1 : index);
  };

  // Safe way to get the current answer for desktop view
  const currentAnswer =
    activeQuestion >= 0 ? faqData[activeQuestion]?.answer : faqData[0]?.answer;
  return (
    <section
      id="faq"
      className="bg-white w-full py-10 px-4 md:px-8 lg:px-16"
      aria-labelledby="faq-heading"
    >
      <div className="max-w-6xl mx-auto">
        <h2 id="faq-heading" className="text-[30px] md:text-[40px] lg:text-[50px] font-semibold text-center mb-8 lg:mb-12">
          Frequently Asked Questions
        </h2>

        {/* Mobile View - Accordion */}
        <div className="block lg:hidden w-full" role="list">
          <div className="flex flex-col space-y-4">
            {faqData.map((faq, index) => (
              <div
                key={index}
                className={`border border-[#EAEAEA] rounded-lg overflow-hidden transition-all duration-200 `}
                role="listitem"
              >
                <button
                  className="w-full p-4 text-left bg-white hover:bg-gray-50 transition-colors flex justify-between items-center"
                  onClick={() => toggleQuestion(index)}
                  aria-expanded={activeQuestion === index}
                  aria-controls={`faq-answer-${index}`}
                  id={`faq-question-${index}`}
                >
                  <span className="text-lg font-semibold text-left pr-4">
                    {faq.question}
                  </span>
                  <ChevronDown
                    size={20}
                    className={`flex-shrink-0 transition-transform duration-200 ${
                      activeQuestion === index ? "rotate-180" : "rotate-0"
                    }`}
                    aria-hidden="true"
                  />
                </button>
                <div
                  id={`faq-answer-${index}`}
                  role="region"
                  aria-labelledby={`faq-question-${index}`}
                  className={`transition-all duration-200 overflow-hidden ${
                    activeQuestion === index
                      ? "max-h-96 opacity-100"
                      : "max-h-0 opacity-0"
                  }`}
                >
                  <div className="p-4 border-t border-[#EAEAEA]">
                    <p className="text-gray-700 leading-relaxed">
                      {faq.answer}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Desktop View - Side by Side */}
        <div className="hidden lg:flex w-full space-x-6 lg:space-x-8">
          {/* Questions List */}
          <div className="flex-1 flex flex-col space-y-4">
            {faqData.map((faq, index) => (
              <div
                key={index}
                className={`p-4 border border-[#EAEAEA] rounded-lg cursor-pointer transition-all duration-200 ${
                  activeQuestion === index
                    ? "bg-black text-white border-black shadow-md"
                    : "bg-white hover:bg-gray-50 hover:border-gray-300"
                }`}
                onClick={() => setActiveQuestion(index)}
              >
                <p
                  className={`text-lg font-semibold ${
                    activeQuestion === index ? "text-white" : "text-gray-800"
                  }`}
                >
                  {faq.question}
                </p>
              </div>
            ))}
          </div>

          {/* Answer Display */}
          <div className="flex-1 bg-[#F5F5F5] p-6 lg:p-8 rounded-lg sticky top-4">
            <p className="text-xl leading-relaxed text-gray-800">
              {currentAnswer ||
                "Select a question from the left to view its answer."}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FAQSection;

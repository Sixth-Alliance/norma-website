"use client";
"use client";
import React from "react";
import RightImage from "@/src/assets/images/right_side_image.jpg";
import DesktopImage from "@/src/assets/images/desktop_food.jpg";
import NewRightImage from "@/src/assets/images/0-202_1.jpg";
import Image from "next/image";
const StorySection = () => {
  return (
    <section
      id="story"
      className="w-full h-fit lg:min-h-screen flex flex-col lg:flex-row lg:space-x-3 space-y-3 lg:space-y-0 items-center"
      aria-labelledby="our-story-heading"
    >
      <article className="flex-1 p-3 md:p-10 lg:pl-16">
        <h2
          id="our-story-heading"
          className="text-[30px] md:text-[40px] lg:text-[50px] font-semibold mt-5 md:mt-0 mb-5"
        >
          Our Story
        </h2>
        <p className="text-sm md:text-lg lg:text-xl text-[#656565] leading-relaxed">
          <strong className="text-black">
            Norma was born from a simple belief:
          </strong>{" "}
          everyone deserves access to fresh, delicious local cuisine without the
          hassle. What started as a single neighborhood outlet has grown into a
          trusted network of culinary hubs, each dedicated to bringing you the
          authentic flavors you love.
        </p>
        <p className="text-sm md:text-lg lg:text-xl text-[#656565] leading-relaxed mt-6">
          We noticed that while food delivery apps connected you with
          restaurants, they often sacrificed the{" "}
          <strong className="text-black">
            freshness, quality, and personal touch
          </strong>{" "}
          that makes local dining special. Norma changed that by creating a
          seamless ecosystem where our outlets maintain complete control over
          preparation, quality, and delivery.
        </p>
        <p className="text-sm md:text-lg lg:text-xl text-[#656565] leading-relaxed mt-6">
          Today, Norma makes it effortless to order from your favorite local
          outlet and track your food in real-time. Whether you're craving
          traditional favorites or exploring new local tastes, we ensure every
          dish is prepared with care, delivered fast, and arrives{" "}
          <strong className="text-black">hot, tasty, and right on time.</strong>
        </p>
        <aside className="mt-8 p-6 bg-white rounded-lg border-l-4 border-orange">
          <blockquote className="text-lg md:text-xl text-[#656565] italic">
            "From our kitchen to your doorstep, we're not just delivering food –
            we're delivering experiences, one hot meal at a time."
          </blockquote>
        </aside>
      </article>
      <figure className="flex-1 md:h-full relative">
        <Image
          src={NewRightImage}
          alt="Fresh local food being prepared at Norma outlet kitchen"
          className="object-cover h-full md:hidden"
          loading="lazy"
        />
        <Image
          src={DesktopImage}
          alt="Fresh local food being prepared at Norma outlet kitchen"
          className="object-cover h-full hidden md:block"
          loading="lazy"
        />
      </figure>
    </section>
  );
};

export default StorySection;

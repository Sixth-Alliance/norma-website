"use client";

import DesktopNavigation from "@/src/components/home-components/home-contents/DesktopNavigation";
import MobileNavigation from "@/src/components/home-components/home-contents/MobileNavigation";
import { Button } from "@/src/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/src/ui/card";
import { ArrowLeft, Phone, Mail, MapPin, Clock } from "lucide-react";
import { useRouter } from "next/navigation";
import Image from "next/image";

const AboutPage = () => {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gray-50">
      <DesktopNavigation />
      <MobileNavigation />
      
      <div className="container mx-auto px-4 py-8 pt-5">
        {/* Header */}
        <div className="flex items-center mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.back()}
            className="mr-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <h1 className="text-2xl font-bold">About Norma</h1>
        </div>

        <div className="max-w-4xl mx-auto space-y-8">
          {/* Hero Section */}
          <Card>
            <CardContent className="p-8">
              <div className="text-center">
                <h2 className="text-3xl font-bold text-gray-900 mb-4">
                  Welcome to Norma
                </h2>
                <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                  Your premier destination for delicious, fresh, and quality meals. 
                  We're committed to bringing you the best food experience with 
                  convenient delivery and pickup options.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Our Story */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Our Story</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">
                Founded with a passion for exceptional food and service, Norma has been 
                serving our community with dedication and love. We believe that great food 
                brings people together and creates memorable experiences.
              </p>
              <p className="text-gray-600">
                From our carefully selected ingredients to our skilled chefs, every aspect 
                of our operation is designed to deliver quality and satisfaction to your table.
              </p>
            </CardContent>
          </Card>

          {/* Our Mission */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Our Mission</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="bg-orange/10 p-4 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                    <span className="text-2xl">🍽️</span>
                  </div>
                  <h3 className="font-semibold mb-2">Quality Food</h3>
                  <p className="text-sm text-gray-600">
                    Using the finest ingredients to create delicious, healthy meals
                  </p>
                </div>
                
                <div className="text-center">
                  <div className="bg-orange/10 p-4 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                    <span className="text-2xl">🚚</span>
                  </div>
                  <h3 className="font-semibold mb-2">Fast Delivery</h3>
                  <p className="text-sm text-gray-600">
                    Quick and reliable delivery service to your doorstep
                  </p>
                </div>
                
                <div className="text-center">
                  <div className="bg-orange/10 p-4 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                    <span className="text-2xl">❤️</span>
                  </div>
                  <h3 className="font-semibold mb-2">Customer Care</h3>
                  <p className="text-sm text-gray-600">
                    Exceptional service and support for every customer
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Contact Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Get in Touch</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <Phone className="h-5 w-5 text-orange" />
                    <div>
                      <p className="font-semibold">Phone</p>
                      <p className="text-gray-600">+234 123 456 7890</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <Mail className="h-5 w-5 text-orange" />
                    <div>
                      <p className="font-semibold">Email</p>
                      <p className="text-gray-600">hello@norma.com</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <MapPin className="h-5 w-5 text-orange" />
                    <div>
                      <p className="font-semibold">Address</p>
                      <p className="text-gray-600">123 Food Street, Lagos, Nigeria</p>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <Clock className="h-5 w-5 text-orange" />
                    <div>
                      <p className="font-semibold">Opening Hours</p>
                      <div className="text-gray-600 text-sm">
                        <p>Monday - Friday: 8:00 AM - 10:00 PM</p>
                        <p>Saturday - Sunday: 9:00 AM - 11:00 PM</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Call to Action */}
          <Card className="bg-orange text-white">
            <CardContent className="p-8 text-center">
              <h3 className="text-2xl font-bold mb-4">Ready to Order?</h3>
              <p className="mb-6">
                Explore our delicious menu and place your order today!
              </p>
              <Button 
                onClick={() => router.push("/home")}
                variant="secondary"
                className="bg-white text-orange hover:bg-gray-100"
              >
                Browse Menu
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AboutPage;
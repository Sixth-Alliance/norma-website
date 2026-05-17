"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import DesktopNavigation from "@/src/components/home-components/home-contents/DesktopNavigation";
import MobileNavigation from "@/src/components/home-components/home-contents/MobileNavigation";
import { Button } from "@/src/ui/button";
import { Input } from "@/src/ui/input";
import { Label } from "@/src/ui/label";
// import { Textarea } from "@/src/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/src/ui/card";
import { ArrowLeft, Phone, Mail, MapPin, Send, Clock } from "lucide-react";
import { showSimpleToast } from "@/src/utils/alertFunctions";

const ContactPage = () => {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });
  const [submitting, setSubmitting] = useState(false);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic validation
    if (!formData.name || !formData.email || !formData.message) {
      showSimpleToast("Please fill in all required fields", "failed");
      return;
    }

    setSubmitting(true);
    
    try {
      // Simulate form submission (replace with actual API call)
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      showSimpleToast("Thank you for your message! We'll get back to you soon.", "success");
      
      // Reset form
      setFormData({
        name: "",
        email: "",
        subject: "",
        message: "",
      });
    } catch (error) {
      showSimpleToast("Failed to send message. Please try again.", "failed");
    } finally {
      setSubmitting(false);
    }
  };

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
          <h1 className="text-2xl font-bold">Contact Us</h1>
        </div>

        <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-8">
          {/* Contact Information */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Get in Touch</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <p className="text-gray-600">
                  We'd love to hear from you. Send us a message and we'll respond as soon as possible.
                </p>

                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <div className="bg-orange/10 p-2 rounded-lg">
                      <Phone className="h-5 w-5 text-orange" />
                    </div>
                    <div>
                      <p className="font-semibold">Phone</p>
                      <p className="text-gray-600">+234 123 456 7890</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <div className="bg-orange/10 p-2 rounded-lg">
                      <Mail className="h-5 w-5 text-orange" />
                    </div>
                    <div>
                      <p className="font-semibold">Email</p>
                      <p className="text-gray-600">hello@norma.com</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <div className="bg-orange/10 p-2 rounded-lg">
                      <MapPin className="h-5 w-5 text-orange" />
                    </div>
                    <div>
                      <p className="font-semibold">Address</p>
                      <p className="text-gray-600">123 Food Street, Lagos, Nigeria</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <div className="bg-orange/10 p-2 rounded-lg">
                      <Clock className="h-5 w-5 text-orange" />
                    </div>
                    <div>
                      <p className="font-semibold">Business Hours</p>
                      <div className="text-gray-600 text-sm">
                        <p>Monday - Friday: 8:00 AM - 10:00 PM</p>
                        <p>Saturday - Sunday: 9:00 AM - 11:00 PM</p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => router.push("/home/orders")}
                >
                  <Phone className="h-4 w-4 mr-2" />
                  Track Your Order
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => router.push("/home")}
                >
                  <Mail className="h-4 w-4 mr-2" />
                  Browse Menu
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => router.push("/home/about")}
                >
                  <MapPin className="h-4 w-4 mr-2" />
                  About Us
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Contact Form */}
          <Card>
            <CardHeader>
              <CardTitle>Send us a Message</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => handleInputChange("name", e.target.value)}
                      placeholder="Your full name"
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleInputChange("email", e.target.value)}
                      placeholder="your.email@example.com"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="subject">Subject</Label>
                  <Input
                    id="subject"
                    value={formData.subject}
                    onChange={(e) => handleInputChange("subject", e.target.value)}
                    placeholder="What is this about?"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="message">Message *</Label>
                  <textarea
                    id="message"
                    value={formData.message}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => handleInputChange("message", e.target.value)}
                    placeholder="Tell us how we can help..."
                    rows={6}
                    required
                    className="flex min-h-[80px] w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-orange focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-orange hover:bg-orange/90 text-white"
                >
                  {submitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Send Message
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ContactPage;
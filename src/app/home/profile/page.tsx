"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/src/store/authStore";
import { updateUserProfile, uploadProfilePicture } from "@/src/app/api/action";
import DesktopNavigation from "@/src/components/home-components/home-contents/DesktopNavigation";
import MobileNavigation from "@/src/components/home-components/home-contents/MobileNavigation";
import { Button } from "@/src/ui/button";
import { Input } from "@/src/ui/input";
import { Label } from "@/src/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/src/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/src/ui/card";
import { Skeleton } from "@/src/ui/skeleton";
import { ArrowLeft, Camera, Save, User } from "lucide-react";
import { showSimpleToast } from "@/src/utils/alertFunctions";
import { normalizeCloudinaryUrl } from "@/src/lib/imageUtils";

const ProfilePage = () => {
  const router = useRouter();
  const { user, fetchUserProfile, isUserAuthenticated, getDisplayName } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
  });

  useEffect(() => {
    if (!isUserAuthenticated()) {
      router.push("/onboarding");
      return;
    }

    const initializeProfile = async () => {
      try {
        setLoading(true);
        await fetchUserProfile();
      } catch (error) {
        console.error("Failed to fetch user profile:", error);
        showSimpleToast("Failed to load profile", "failed");
      } finally {
        setLoading(false);
      }
    };

    initializeProfile();
  }, [isUserAuthenticated, router, fetchUserProfile]);

  // Update form data when user data changes
  useEffect(() => {
    if (user) {
      setFormData({
        first_name: user.first_name || "",
        last_name: user.last_name || "",
        email: user.email || "",
        phone: user.phone || "",
      });
    }
  }, [user]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleUpdateProfile = async () => {
    try {
      setUpdating(true);
      
      // Only send changed fields
      const updates: any = {};
      if (formData.first_name !== user.first_name) updates.first_name = formData.first_name;
      if (formData.last_name !== user.last_name) updates.last_name = formData.last_name;
      if (formData.phone !== user.phone) updates.phone = formData.phone;
      
      if (Object.keys(updates).length === 0) {
        showSimpleToast("No changes to save", "failed");
        return;
      }

      await updateUserProfile(updates);
      await fetchUserProfile(); // Refresh user data
      showSimpleToast("Profile updated successfully!", "success");
    } catch (error: any) {
      console.error("Failed to update profile:", error);
      showSimpleToast(error.message || "Failed to update profile", "failed");
    } finally {
      setUpdating(false);
    }
  };

  const handleProfilePictureUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      showSimpleToast("Please select an image file", "failed");
      return;
    }

    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      showSimpleToast("Image size must be less than 5MB", "failed");
      return;
    }

    try {
      setUploadingImage(true);
      await uploadProfilePicture(file);
      await fetchUserProfile(); // Refresh user data to get new profile picture
      showSimpleToast("Profile picture updated successfully!", "success");
    } catch (error: any) {
      console.error("Failed to upload profile picture:", error);
      showSimpleToast(error.message || "Failed to upload profile picture", "failed");
    } finally {
      setUploadingImage(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <DesktopNavigation />
        <MobileNavigation />
        <div className="container mx-auto px-4 py-8 pt-5">
          <Card className="max-w-2xl mx-auto">
            <CardHeader>
              <Skeleton className="h-8 w-32" />
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex flex-col items-center space-y-4">
                <Skeleton className="h-24 w-24 rounded-full" />
                <Skeleton className="h-4 w-40" />
              </div>
              <div className="space-y-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="space-y-2">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

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
          <h1 className="text-2xl font-bold">Profile Settings</h1>
        </div>

        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle>Personal Information</CardTitle>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {/* Profile Picture Section */}
            <div className="flex flex-col items-center space-y-4">
              <div className="relative">
                <Avatar className="h-24 w-24">
                  <AvatarImage src={normalizeCloudinaryUrl(user.profile_pic)} alt="Profile" />
                  <AvatarFallback className="bg-orange text-white text-xl">
                    {getDisplayName().charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                
                <label className="absolute bottom-0 right-0 bg-orange hover:bg-orange/90 text-white p-2 rounded-full cursor-pointer transition-colors">
                  <Camera className="h-4 w-4" />
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleProfilePictureUpload}
                    className="hidden"
                    disabled={uploadingImage}
                  />
                </label>
                
                {uploadingImage && (
                  <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                  </div>
                )}
              </div>
              
              <p className="text-sm text-gray-600">
                Click the camera icon to upload a new profile picture
              </p>
            </div>

            {/* Form Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="first_name">First Name</Label>
                <Input
                  id="first_name"
                  value={formData.first_name}
                  onChange={(e) => handleInputChange("first_name", e.target.value)}
                  placeholder="Enter your first name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="last_name">Last Name</Label>
                <Input
                  id="last_name"
                  value={formData.last_name}
                  onChange={(e) => handleInputChange("last_name", e.target.value)}
                  placeholder="Enter your last name"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                disabled
                className="bg-gray-100"
              />
              <p className="text-sm text-gray-600">
                Email cannot be changed. Contact support if needed.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => handleInputChange("phone", e.target.value)}
                placeholder="Enter your phone number"
              />
            </div>

            {/* Save Button */}
            <div className="flex justify-end pt-4">
              <Button
                onClick={handleUpdateProfile}
                disabled={updating}
                className="bg-orange hover:bg-orange/90 text-white"
              >
                {updating ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Updating...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Changes
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ProfilePage;
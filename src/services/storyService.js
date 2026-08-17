// src/services/storageService.js
// CLOUDINARY VERSION - No Firebase Storage needed!

const CLOUDINARY_CLOUD_NAME = "xs7qhkuq";
const CLOUDINARY_UPLOAD_PRESET = "socialchat_uploads";

// Compress image before upload
const compressImage = (file, quality = 0.8) => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const maxWidth = 1200;
        const maxHeight = 1200;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height *= maxWidth / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width *= maxHeight / height;
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            resolve(blob);
          },
          "image/jpeg",
          quality
        );
      };
    };
  });
};

// Generic upload function to Cloudinary
const uploadToCloudinary = async (file, folder = "general") => {
  try {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
    formData.append("folder", folder);

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
      {
        method: "POST",
        body: formData
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Cloudinary error details:", errorData);
      throw new Error("Upload failed");
    }

    const data = await response.json();
    return data.secure_url;
  } catch (error) {
    console.error("Cloudinary upload error:", error);
    throw new Error("Failed to upload image");
  }
};

// Upload profile photo
export const uploadProfilePhoto = async (userId, file) => {
  try {
    const compressedBlob = await compressImage(file, 0.8);
    const compressedFile = new File([compressedBlob], `profile-${userId}.jpg`, {
      type: "image/jpeg"
    });

    const downloadURL = await uploadToCloudinary(compressedFile, "profile-photos");
    return downloadURL;
  } catch (error) {
    throw new Error(error.message);
  }
};

// Upload chat image
export const uploadChatImage = async (chatId, senderId, file) => {
  try {
    const compressedBlob = await compressImage(file, 0.7);
    const timestamp = Date.now();
    const compressedFile = new File(
      [compressedBlob],
      `chat-${chatId}-${senderId}-${timestamp}.jpg`,
      { type: "image/jpeg" }
    );

    const downloadURL = await uploadToCloudinary(compressedFile, `chat-images/${chatId}`);
    return downloadURL;
  } catch (error) {
    throw new Error(error.message);
  }
};

// Upload group image
export const uploadGroupImage = async (groupId, senderId, file) => {
  try {
    const compressedBlob = await compressImage(file, 0.7);
    const timestamp = Date.now();
    const compressedFile = new File(
      [compressedBlob],
      `group-${groupId}-${senderId}-${timestamp}.jpg`,
      { type: "image/jpeg" }
    );

    const downloadURL = await uploadToCloudinary(compressedFile, `group-images/${groupId}`);
    return downloadURL;
  } catch (error) {
    throw new Error(error.message);
  }
};

// Upload story media
export const uploadStoryMedia = async (userId, file, fileType = "photo") => {
  try {
    if (fileType === "photo") {
      const compressedBlob = await compressImage(file, 0.8);
      const compressedFile = new File(
        [compressedBlob],
        `story-${userId}-${Date.now()}.jpg`,
        { type: "image/jpeg" }
      );

      const downloadURL = await uploadToCloudinary(compressedFile, `stories/${userId}`);
      return downloadURL;
    } else {
      const downloadURL = await uploadToCloudinary(file, `stories/${userId}`);
      return downloadURL;
    }
  } catch (error) {
    throw new Error(error.message);
  }
};

// Upload group photo
export const uploadGroupPhoto = async (groupId, file) => {
  try {
    const compressedBlob = await compressImage(file, 0.8);
    const compressedFile = new File([compressedBlob], `group-photo-${groupId}.jpg`, {
      type: "image/jpeg"
    });

    const downloadURL = await uploadToCloudinary(compressedFile, "group-photos");
    return downloadURL;
  } catch (error) {
    throw new Error(error.message);
  }
};
import { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  Share,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Plus,
  Share2,
  ExternalLink,
  Gift,
  Users,
  LogOut,
  LogIn,
} from "lucide-react-native";
import { useAuth } from "@/utils/auth/useAuth";
import { useUser } from "@/utils/auth/useUser";

function ItemCard({ item, isWishlist = false }) {
  const isUrlItem = item.input_type === "url";

  return (
    <View
      style={{
        backgroundColor: "white",
        borderRadius: 24,
        padding: 20,
        marginBottom: 16,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 3,
      }}
    >
      <View style={{ flexDirection: "row", gap: 16 }}>
        {isUrlItem && item.image_url && (
          <View
            style={{
              width: 64,
              height: 64,
              backgroundColor: "#F3F4F6",
              borderRadius: 16,
              overflow: "hidden",
            }}
          >
            {/* Image would go here */}
          </View>
        )}

        <View style={{ flex: 1 }}>
          {isUrlItem ? (
            <>
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: "600",
                  color: "#111827",
                  marginBottom: 4,
                }}
              >
                {item.title}
              </Text>
              <Text
                style={{
                  fontSize: 14,
                  color: "#6B7280",
                  marginBottom: 8,
                }}
              >
                {item.description}
              </Text>
              {item.price && (
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: "500",
                    color: "#111827",
                    marginBottom: 8,
                  }}
                >
                  ${item.price}
                </Text>
              )}
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
              >
                <ExternalLink size={14} color="#9CA3AF" />
                <Text
                  style={{
                    fontSize: 12,
                    color: "#6B7280",
                  }}
                  numberOfLines={1}
                >
                  {item.url}
                </Text>
              </View>
            </>
          ) : (
            <Text
              style={{
                fontSize: 16,
                color: "#111827",
              }}
            >
              {item.description}
            </Text>
          )}

          {isWishlist && item.group_gift_enabled && (
            <View style={{ marginTop: 12 }}>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  backgroundColor: "#EBF8FF",
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 20,
                  gap: 6,
                  alignSelf: "flex-start",
                }}
              >
                <Users size={12} color="#3B82F6" />
                <Text
                  style={{
                    fontSize: 12,
                    color: "#3B82F6",
                    fontWeight: "500",
                  }}
                >
                  Group gift enabled (${item.group_gift_target})
                </Text>
              </View>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

function AddItemModal({ visible, onClose, isWishlist, onSubmit }) {
  const [inputType, setInputType] = useState("text");
  const [textDescription, setTextDescription] = useState("");
  const [urlInput, setUrlInput] = useState("");
  const [groupGiftEnabled, setGroupGiftEnabled] = useState(false);
  const [groupGiftTarget, setGroupGiftTarget] = useState("");
  const [loading, setLoading] = useState(false);
  const insets = useSafeAreaInsets();

  const resetForm = () => {
    setInputType("text");
    setTextDescription("");
    setUrlInput("");
    setGroupGiftEnabled(false);
    setGroupGiftTarget("");
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const itemData = {
        item_type: isWishlist ? "wishlist" : "inventory",
        input_type: inputType,
        description: inputType === "text" ? textDescription : urlInput,
        url: inputType === "url" ? urlInput : null,
        group_gift_enabled: isWishlist && groupGiftEnabled,
        group_gift_target:
          isWishlist && groupGiftEnabled ? parseFloat(groupGiftTarget) : null,
      };

      await onSubmit(itemData);
      resetForm();
      onClose();
    } catch (error) {
      console.error("Error adding item:", error);
      Alert.alert("Error", "Failed to add item. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <View
        style={{ flex: 1, backgroundColor: "white", paddingTop: insets.top }}
      >
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            padding: 20,
          }}
        >
          <TouchableOpacity onPress={onClose}>
            <Text style={{ fontSize: 16, color: "#6B7280" }}>Cancel</Text>
          </TouchableOpacity>
          <Text style={{ fontSize: 18, fontWeight: "600", color: "#111827" }}>
            Add to {isWishlist ? "Wishlist" : "Inventory"}
          </Text>
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={
              loading ||
              (!textDescription && !urlInput) ||
              (groupGiftEnabled && !groupGiftTarget)
            }
            style={{
              opacity:
                loading ||
                (!textDescription && !urlInput) ||
                (groupGiftEnabled && !groupGiftTarget)
                  ? 0.5
                  : 1,
            }}
          >
            <Text style={{ fontSize: 16, color: "#3B82F6", fontWeight: "600" }}>
              {loading ? "Adding..." : "Add"}
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={{ flex: 1, padding: 20 }}>
          <View style={{ flexDirection: "row", gap: 8, marginBottom: 24 }}>
            <TouchableOpacity
              onPress={() => setInputType("text")}
              style={{
                flex: 1,
                paddingVertical: 12,
                paddingHorizontal: 16,
                borderRadius: 24,
                backgroundColor: inputType === "text" ? "#EBF8FF" : "#F3F4F6",
              }}
            >
              <Text
                style={{
                  textAlign: "center",
                  fontSize: 14,
                  color: inputType === "text" ? "#3B82F6" : "#6B7280",
                }}
              >
                Text Description
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setInputType("url")}
              style={{
                flex: 1,
                paddingVertical: 12,
                paddingHorizontal: 16,
                borderRadius: 24,
                backgroundColor: inputType === "url" ? "#EBF8FF" : "#F3F4F6",
              }}
            >
              <Text
                style={{
                  textAlign: "center",
                  fontSize: 14,
                  color: inputType === "url" ? "#3B82F6" : "#6B7280",
                }}
              >
                Product URL
              </Text>
            </TouchableOpacity>
          </View>

          {inputType === "text" ? (
            <View style={{ marginBottom: 16 }}>
              <TextInput
                value={textDescription}
                onChangeText={setTextDescription}
                placeholder="Describe what you want or own..."
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                style={{
                  backgroundColor: "#F9FAFB",
                  borderRadius: 16,
                  padding: 16,
                  fontSize: 14,
                  minHeight: 100,
                }}
              />
            </View>
          ) : (
            <View style={{ marginBottom: 16 }}>
              <TextInput
                value={urlInput}
                onChangeText={setUrlInput}
                placeholder="Paste product URL..."
                style={{
                  backgroundColor: "#F9FAFB",
                  borderRadius: 16,
                  padding: 16,
                  fontSize: 14,
                }}
              />
            </View>
          )}

          {isWishlist && (
            <View style={{ marginBottom: 16 }}>
              <TouchableOpacity
                onPress={() => setGroupGiftEnabled(!groupGiftEnabled)}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 12,
                  marginBottom: 16,
                }}
              >
                <View
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: 6,
                    backgroundColor: groupGiftEnabled
                      ? "#3B82F6"
                      : "transparent",
                    borderWidth: 2,
                    borderColor: "#3B82F6",
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                >
                  {groupGiftEnabled && (
                    <Text style={{ color: "white", fontSize: 12 }}>✓</Text>
                  )}
                </View>
                <Text style={{ fontSize: 14, color: "#111827" }}>
                  Enable group gifting for this item
                </Text>
              </TouchableOpacity>

              {groupGiftEnabled && (
                <View>
                  <Text
                    style={{ fontSize: 14, color: "#111827", marginBottom: 8 }}
                  >
                    Target amount ($)
                  </Text>
                  <TextInput
                    value={groupGiftTarget}
                    onChangeText={setGroupGiftTarget}
                    placeholder="0.00"
                    keyboardType="decimal-pad"
                    style={{
                      backgroundColor: "#F9FAFB",
                      borderRadius: 16,
                      padding: 16,
                      fontSize: 14,
                    }}
                  />
                </View>
              )}
            </View>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

export default function ProfileScreen() {
  const [wishlistItems, setWishlistItems] = useState([]);
  const [inventoryItems, setInventoryItems] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [modalType, setModalType] = useState("wishlist");
  const [loading, setLoading] = useState(true);
  const [profileUser, setProfileUser] = useState(null);
  const insets = useSafeAreaInsets();

  const { isAuthenticated, isReady, signIn, signOut } = useAuth();
  const { user: currentUser } = useUser();

  useEffect(() => {
    if (isReady && isAuthenticated && currentUser) {
      loadUserData();
    } else if (isReady) {
      setLoading(false);
    }
  }, [isReady, isAuthenticated, currentUser]);

  const loadUserData = async () => {
    try {
      setLoading(true);

      // Get current user's username from their email or ID
      const username =
        currentUser.email?.split("@")[0] || `user${currentUser.id}`;

      const userResponse = await fetch(`/api/users/${username}`);
      if (userResponse.ok) {
        const userData = await userResponse.json();
        setProfileUser(userData);

        const itemsResponse = await fetch(`/api/items?username=${username}`);
        if (itemsResponse.ok) {
          const items = await itemsResponse.json();
          setWishlistItems(
            items.filter((item) => item.item_type === "wishlist"),
          );
          setInventoryItems(
            items.filter((item) => item.item_type === "inventory"),
          );
        }
      } else {
        // User doesn't exist in our system yet, create them
        const createUserResponse = await fetch("/api/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username: username,
            email: currentUser.email,
            full_name: currentUser.name || currentUser.email,
          }),
        });

        if (createUserResponse.ok) {
          const newUser = await createUserResponse.json();
          setProfileUser(newUser);
        }
      }
    } catch (error) {
      console.error("Error loading user data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddItem = (type) => {
    setModalType(type);
    setShowAddModal(true);
  };

  const handleSubmitItem = async (itemData) => {
    try {
      if (!profileUser) return;

      const response = await fetch("/api/items", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...itemData,
          user_id: profileUser.id,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create item");
      }

      const newItem = await response.json();

      if (newItem.item_type === "wishlist") {
        setWishlistItems((prev) => [newItem, ...prev]);
      } else {
        setInventoryItems((prev) => [newItem, ...prev]);
      }
    } catch (error) {
      console.error("Error creating item:", error);
      throw error;
    }
  };

  const shareProfile = async () => {
    if (!profileUser) return;

    const shareableLink = `regretnothing.com/p/${profileUser.username}`;
    try {
      await Share.share({
        message: `Check out my wishlist on RegretNothing: https://${shareableLink}`,
        url: `https://${shareableLink}`,
        title: "My RegretNothing Wishlist",
      });
    } catch (error) {
      console.error("Error sharing:", error);
    }
  };

  const handleSignOut = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign Out", style: "destructive", onPress: signOut },
    ]);
  };

  // Show sign in screen if not authenticated
  if (isReady && !isAuthenticated) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: "#F9FAFB",
          justifyContent: "center",
          alignItems: "center",
          padding: 40,
        }}
      >
        <StatusBar style="dark" />
        <View
          style={{
            width: 80,
            height: 80,
            backgroundColor: "#3B82F6",
            borderRadius: 40,
            justifyContent: "center",
            alignItems: "center",
            marginBottom: 32,
          }}
        >
          <Gift size={40} color="white" />
        </View>

        <Text
          style={{
            fontSize: 32,
            fontWeight: "600",
            color: "#111827",
            textAlign: "center",
            marginBottom: 16,
          }}
        >
          RegretNothing
        </Text>

        <Text
          style={{
            fontSize: 16,
            color: "#6B7280",
            textAlign: "center",
            marginBottom: 48,
            lineHeight: 24,
          }}
        >
          Create your wishlist and inventory.{"\n"}Share what you want and
          already have.
        </Text>

        <TouchableOpacity
          onPress={signIn}
          style={{
            backgroundColor: "#3B82F6",
            paddingHorizontal: 32,
            paddingVertical: 16,
            borderRadius: 24,
            flexDirection: "row",
            alignItems: "center",
            gap: 12,
            width: "100%",
            justifyContent: "center",
          }}
        >
          <LogIn size={20} color="white" />
          <Text style={{ color: "white", fontSize: 16, fontWeight: "600" }}>
            Sign In to Get Started
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: "#F9FAFB",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <StatusBar style="dark" />
        <View
          style={{
            width: 32,
            height: 32,
            backgroundColor: "#3B82F6",
            borderRadius: 16,
            marginBottom: 16,
          }}
        />
        <Text style={{ fontSize: 16, color: "#6B7280" }}>
          Loading your profile...
        </Text>
      </View>
    );
  }

  const shareableLink = profileUser
    ? `regretnothing.com/p/${profileUser.username}`
    : "";

  return (
    <View style={{ flex: 1, backgroundColor: "#F9FAFB" }}>
      <StatusBar style="dark" />

      {/* Header */}
      <View
        style={{
          backgroundColor: "white",
          borderBottomWidth: 1,
          borderBottomColor: "#E5E7EB",
          paddingTop: insets.top,
          paddingHorizontal: 20,
          paddingBottom: 20,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 16,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
            <View
              style={{
                width: 40,
                height: 40,
                backgroundColor: "#3B82F6",
                borderRadius: 20,
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <Gift size={20} color="white" />
            </View>
            <View>
              <Text
                style={{ fontSize: 24, fontWeight: "600", color: "#111827" }}
              >
                RegretNothing
              </Text>
              <Text style={{ fontSize: 14, color: "#6B7280" }}>
                {profileUser?.full_name || profileUser?.username}'s wishlist
                profile
              </Text>
            </View>
          </View>

          <View style={{ flexDirection: "row", gap: 8 }}>
            <TouchableOpacity
              onPress={shareProfile}
              style={{
                backgroundColor: "#3B82F6",
                paddingHorizontal: 16,
                paddingVertical: 8,
                borderRadius: 16,
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
              }}
            >
              <Share2 size={16} color="white" />
              <Text style={{ color: "white", fontSize: 14, fontWeight: "500" }}>
                Share
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleSignOut}
              style={{
                backgroundColor: "#6B7280",
                paddingHorizontal: 16,
                paddingVertical: 8,
                borderRadius: 16,
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
              }}
            >
              <LogOut size={16} color="white" />
              <Text style={{ color: "white", fontSize: 14, fontWeight: "500" }}>
                Sign Out
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {shareableLink && (
          <View
            style={{
              backgroundColor: "#EBF8FF",
              borderRadius: 16,
              padding: 16,
            }}
          >
            <Text style={{ fontSize: 14, color: "#3B82F6", marginBottom: 4 }}>
              Your shareable link:
            </Text>
            <Text style={{ fontSize: 14, color: "#1E40AF", fontWeight: "500" }}>
              {shareableLink}
            </Text>
          </View>
        )}
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
      >
        <View style={{ padding: 20 }}>
          {/* What I Want */}
          <View style={{ marginBottom: 32 }}>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 16,
              }}
            >
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 12 }}
              >
                <Text
                  style={{ fontSize: 20, fontWeight: "600", color: "#111827" }}
                >
                  What I Want
                </Text>
                <View
                  style={{
                    backgroundColor: "#F3F4F6",
                    paddingHorizontal: 12,
                    paddingVertical: 4,
                    borderRadius: 16,
                  }}
                >
                  <Text style={{ fontSize: 12, color: "#6B7280" }}>
                    {wishlistItems.length}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => handleAddItem("wishlist")}
                style={{
                  backgroundColor: "#3B82F6",
                  paddingHorizontal: 16,
                  paddingVertical: 8,
                  borderRadius: 16,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <Plus size={16} color="white" />
                <Text
                  style={{ color: "white", fontSize: 14, fontWeight: "500" }}
                >
                  Add
                </Text>
              </TouchableOpacity>
            </View>

            {wishlistItems.length === 0 ? (
              <View
                style={{
                  backgroundColor: "white",
                  borderRadius: 24,
                  padding: 32,
                  alignItems: "center",
                }}
              >
                <Text
                  style={{
                    fontSize: 16,
                    color: "#6B7280",
                    textAlign: "center",
                  }}
                >
                  No wishlist items yet. Add your first item to get started!
                </Text>
              </View>
            ) : (
              wishlistItems.map((item) => (
                <ItemCard key={item.id} item={item} isWishlist={true} />
              ))
            )}
          </View>

          {/* What I Own */}
          <View>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 16,
              }}
            >
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 12 }}
              >
                <Text
                  style={{ fontSize: 20, fontWeight: "600", color: "#111827" }}
                >
                  What I Own
                </Text>
                <View
                  style={{
                    backgroundColor: "#F3F4F6",
                    paddingHorizontal: 12,
                    paddingVertical: 4,
                    borderRadius: 16,
                  }}
                >
                  <Text style={{ fontSize: 12, color: "#6B7280" }}>
                    {inventoryItems.length}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => handleAddItem("inventory")}
                style={{
                  backgroundColor: "#6B7280",
                  paddingHorizontal: 16,
                  paddingVertical: 8,
                  borderRadius: 16,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <Plus size={16} color="white" />
                <Text
                  style={{ color: "white", fontSize: 14, fontWeight: "500" }}
                >
                  Add
                </Text>
              </TouchableOpacity>
            </View>

            {inventoryItems.length === 0 ? (
              <View
                style={{
                  backgroundColor: "white",
                  borderRadius: 24,
                  padding: 32,
                  alignItems: "center",
                }}
              >
                <Text
                  style={{
                    fontSize: 16,
                    color: "#6B7280",
                    textAlign: "center",
                  }}
                >
                  No inventory items yet. Add what you already own to help
                  gifters choose better!
                </Text>
              </View>
            ) : (
              inventoryItems.map((item) => (
                <ItemCard key={item.id} item={item} isWishlist={false} />
              ))
            )}
          </View>
        </View>
      </ScrollView>

      <AddItemModal
        visible={showAddModal}
        onClose={() => setShowAddModal(false)}
        isWishlist={modalType === "wishlist"}
        onSubmit={handleSubmitItem}
      />
    </View>
  );
}

import { useState, useEffect } from "react";
import useUser from "@/utils/useUser";

function ProfilePage({ params }) {
  const { username } = params;
  const [profileUser, setProfileUser] = useState(null);
  const [wishlistItems, setWishlistItems] = useState([]);
  const [inventoryItems, setInventoryItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const { data: currentUser } = useUser();
  const isOwnProfile = currentUser && profileUser && currentUser.username === profileUser.username;

  useEffect(() => {
    loadProfileData();
  }, [username]);

  const loadProfileData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get user profile
      const userResponse = await fetch(`/api/users/${username}`);
      if (!userResponse.ok) {
        throw new Error('User not found');
      }
      const userData = await userResponse.json();
      setProfileUser(userData);

      // Get user's items
      const itemsResponse = await fetch(`/api/items?username=${username}`);
      if (itemsResponse.ok) {
        const items = await itemsResponse.json();
        setWishlistItems(items.filter(item => item.item_type === 'wishlist'));
        setInventoryItems(items.filter(item => item.item_type === 'inventory'));
      }
    } catch (error) {
      console.error('Error loading profile:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-600">
            <svg className="h-8 w-8 text-white animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          </div>
          <p className="text-gray-600">Loading {username}'s profile...</p>
        </div>
      </div>
    );
  }

  if (error || !profileUser) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50 p-4">
        <div className="text-center max-w-md">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-400">
            <svg className="h-8 w-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Profile Not Found</h1>
          <p className="text-gray-600 mb-4">The profile for "{username}" doesn't exist or has been removed.</p>
          <a href="/" className="inline-block bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
            Go Home
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-600">
                <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4V2C7 1.44772 7.44772 1 8 1H16C16.5523 1 17 1.44772 17 2V4M7 4H4C3.44772 4 3 4.44772 3 5V20C3 20.5523 3.44772 21 4 21H20C20.5523 21 21 20.5523 21 20V5C21 4.44772 20.5523 4 20 4H17M7 4H17M9 9H15M9 13H15M9 17H15" />
                </svg>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-800">
                  {profileUser.full_name || profileUser.username}'s {isOwnProfile ? 'Profile' : 'Wishlist'}
                </h1>
                <p className="text-gray-600">
                  {isOwnProfile ? 'Manage your wishlist and inventory' : 'Choose the perfect gift from their wishlist'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {isOwnProfile && (
                <a
                  href="/account/logout"
                  className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Sign Out
                </a>
              )}
            </div>
          </div>
          
          {/* Shareable link */}
          <div className="mt-4 bg-blue-50 rounded-lg p-4">
            <p className="text-sm text-blue-600 mb-1">Shareable link:</p>
            <p className="text-blue-800 font-medium">regretnothing.com/profile/{profileUser.username}</p>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Wishlist */}
          <div>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-semibold text-gray-800">
                  What {isOwnProfile ? 'I Want' : 'They Want'}
                </h2>
                <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-sm">
                  {wishlistItems.length}
                </span>
              </div>
              {isOwnProfile && (
                <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
                  Add Item
                </button>
              )}
            </div>
            
            <div className="space-y-4">
              {wishlistItems.length === 0 ? (
                <div className="bg-white rounded-xl p-8 text-center">
                  <p className="text-gray-500">
                    {isOwnProfile 
                      ? "No wishlist items yet. Add your first item to get started!"
                      : `${profileUser.full_name || profileUser.username} hasn't added any wishlist items yet.`
                    }
                  </p>
                </div>
              ) : (
                wishlistItems.map((item) => (
                  <div key={item.id} className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                    {item.image_url && (
                      <img src={item.image_url} alt={item.title || item.description} className="w-full h-48 object-cover rounded-lg mb-4" />
                    )}
                    <h3 className="font-semibold text-gray-800 mb-2">
                      {item.title || item.description}
                    </h3>
                    {item.description && item.title && (
                      <p className="text-gray-600 mb-3">{item.description}</p>
                    )}
                    {item.price && (
                      <p className="text-blue-600 font-semibold mb-3">${item.price}</p>
                    )}
                    {item.url && (
                      <a 
                        href={item.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-700 text-sm"
                      >
                        View Product →
                      </a>
                    )}
                    {!isOwnProfile && (
                      <div className="mt-4 flex gap-2">
                        <button className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors text-sm">
                          Claim Gift
                        </button>
                        {item.group_gift_enabled && (
                          <button className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition-colors text-sm">
                            Chip In
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Inventory */}
          <div>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-semibold text-gray-800">
                  What {isOwnProfile ? 'I Own' : 'They Already Own'}
                </h2>
                <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-sm">
                  {inventoryItems.length}
                </span>
              </div>
              {isOwnProfile && (
                <button className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors">
                  Add Item
                </button>
              )}
            </div>
            
            <div className="space-y-4">
              {inventoryItems.length === 0 ? (
                <div className="bg-white rounded-xl p-8 text-center">
                  <p className="text-gray-500">
                    {isOwnProfile 
                      ? "No inventory items yet. Add what you already own to help gifters choose better!"
                      : `${profileUser.full_name || profileUser.username} hasn't added any inventory items yet.`
                    }
                  </p>
                </div>
              ) : (
                inventoryItems.map((item) => (
                  <div key={item.id} className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                    {item.image_url && (
                      <img src={item.image_url} alt={item.title || item.description} className="w-full h-48 object-cover rounded-lg mb-4" />
                    )}
                    <h3 className="font-semibold text-gray-800 mb-2">
                      {item.title || item.description}
                    </h3>
                    {item.description && item.title && (
                      <p className="text-gray-600 mb-3">{item.description}</p>
                    )}
                    {item.url && (
                      <a 
                        href={item.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-700 text-sm"
                      >
                        View Product →
                      </a>
                    )}
                  </div>
                ))
              )}
              
              {inventoryItems.length > 0 && !isOwnProfile && (
                <div className="bg-blue-50 rounded-lg p-4">
                  <p className="text-blue-800 text-sm">
                    💡 These items show what {profileUser.full_name || profileUser.username} already owns, so you can avoid duplicate gifts and choose complementary items instead.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProfilePage;
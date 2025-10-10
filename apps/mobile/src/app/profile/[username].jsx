import { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Modal, TextInput, Alert } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Gift, Users, ExternalLink, Check, DollarSign } from 'lucide-react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

function GifterItemCard({ item, onClaim, onChipIn, contributions, claims }) {
  const isUrlItem = item.input_type === 'url';
  const isGroupGift = item.group_gift_enabled;
  
  // Calculate group gift progress from contributions
  const itemContributions = contributions.filter(c => c.item_id === item.id);
  const groupGiftRaised = itemContributions.reduce((total, c) => total + parseFloat(c.amount), 0);
  const groupGiftTarget = parseFloat(item.group_gift_target) || 0;
  const groupGiftProgress = isGroupGift && groupGiftTarget > 0 ? (groupGiftRaised / groupGiftTarget) * 100 : 0;
  
  // Check if item is claimed
  const itemClaim = claims.find(c => c.item_id === item.id);
  const isClaimed = !!itemClaim;
  
  return (
    <View style={{
      backgroundColor: 'white',
      borderRadius: 24,
      padding: 20,
      marginBottom: 16,
      opacity: isClaimed ? 0.6 : 1,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 3,
    }}>
      <View style={{ flexDirection: 'row', gap: 16 }}>
        {isUrlItem && item.image_url && (
          <View style={{
            width: 64,
            height: 64,
            backgroundColor: '#F3F4F6',
            borderRadius: 16,
            overflow: 'hidden'
          }}>
            {/* Image would go here */}
          </View>
        )}
        
        <View style={{ flex: 1 }}>
          {isUrlItem ? (
            <>
              <Text style={{
                fontSize: 16,
                fontWeight: '600',
                color: '#111827',
                marginBottom: 4
              }}>
                {item.title}
              </Text>
              <Text style={{
                fontSize: 14,
                color: '#6B7280',
                marginBottom: 8
              }}>
                {item.description}
              </Text>
              {item.price && (
                <Text style={{
                  fontSize: 14,
                  fontWeight: '500',
                  color: '#111827',
                  marginBottom: 8
                }}>
                  ${item.price}
                </Text>
              )}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <ExternalLink size={14} color="#9CA3AF" />
                <Text style={{
                  fontSize: 12,
                  color: '#6B7280'
                }} numberOfLines={1}>
                  {item.url}
                </Text>
              </View>
            </>
          ) : (
            <Text style={{
              fontSize: 16,
              color: '#111827'
            }}>
              {item.description}
            </Text>
          )}

          {/* Group Gift Progress */}
          {isGroupGift && (
            <View style={{ marginTop: 16 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                <Text style={{ fontSize: 14, color: '#6B7280' }}>
                  Group Gift Progress
                </Text>
                <Text style={{ fontSize: 14, fontWeight: '500', color: '#111827' }}>
                  ${groupGiftRaised.toFixed(2)} / ${groupGiftTarget.toFixed(2)}
                </Text>
              </View>
              <View style={{
                width: '100%',
                height: 8,
                backgroundColor: '#E5E7EB',
                borderRadius: 4,
                overflow: 'hidden'
              }}>
                <View style={{
                  height: '100%',
                  backgroundColor: '#3B82F6',
                  width: `${Math.min(groupGiftProgress, 100)}%`,
                  borderRadius: 4
                }} />
              </View>
              {itemContributions.length > 0 && (
                <Text style={{ fontSize: 12, color: '#6B7280', marginTop: 8 }}>
                  {itemContributions.length} contributor{itemContributions.length !== 1 ? 's' : ''}
                </Text>
              )}
            </View>
          )}

          {/* Action Buttons */}
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 16 }}>
            {isClaimed ? (
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: '#DCFCE7',
                paddingHorizontal: 16,
                paddingVertical: 8,
                borderRadius: 16,
                gap: 8
              }}>
                <Check size={16} color="#16A34A" />
                <Text style={{ fontSize: 14, color: '#16A34A', fontWeight: '500' }}>
                  Claimed
                </Text>
              </View>
            ) : (
              <>
                {!isGroupGift && (
                  <TouchableOpacity
                    onPress={() => onClaim(item.id)}
                    style={{
                      backgroundColor: '#3B82F6',
                      paddingHorizontal: 16,
                      paddingVertical: 8,
                      borderRadius: 16,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 8
                    }}
                  >
                    <Gift size={16} color="white" />
                    <Text style={{ color: 'white', fontSize: 14, fontWeight: '500' }}>
                      Claim Gift
                    </Text>
                  </TouchableOpacity>
                )}
                
                {isGroupGift && groupGiftRaised < groupGiftTarget && (
                  <TouchableOpacity
                    onPress={() => onChipIn(item.id)}
                    style={{
                      backgroundColor: '#7C3AED',
                      paddingHorizontal: 16,
                      paddingVertical: 8,
                      borderRadius: 16,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 8
                    }}
                  >
                    <DollarSign size={16} color="white" />
                    <Text style={{ color: 'white', fontSize: 14, fontWeight: '500' }}>
                      Chip In
                    </Text>
                  </TouchableOpacity>
                )}
              </>
            )}
          </View>
        </View>
      </View>
    </View>
  );
}

function InventoryItemCard({ item }) {
  const isUrlItem = item.input_type === 'url';
  
  return (
    <View style={{
      backgroundColor: 'white',
      borderRadius: 24,
      padding: 20,
      marginBottom: 16,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 3,
    }}>
      <View style={{ flexDirection: 'row', gap: 16 }}>
        {isUrlItem && item.image_url && (
          <View style={{
            width: 64,
            height: 64,
            backgroundColor: '#F3F4F6',
            borderRadius: 16,
            overflow: 'hidden'
          }}>
            {/* Image would go here */}
          </View>
        )}
        
        <View style={{ flex: 1 }}>
          {isUrlItem ? (
            <>
              <Text style={{
                fontSize: 16,
                fontWeight: '600',
                color: '#111827',
                marginBottom: 4
              }}>
                {item.title}
              </Text>
              <Text style={{
                fontSize: 14,
                color: '#6B7280'
              }}>
                {item.description}
              </Text>
            </>
          ) : (
            <Text style={{
              fontSize: 16,
              color: '#111827'
            }}>
              {item.description}
            </Text>
          )}
        </View>
      </View>
    </View>
  );
}

function ClaimModal({ visible, onClose, onConfirm, itemTitle }) {
  const [claimerName, setClaimerName] = useState('');
  const [claimerEmail, setClaimerEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const insets = useSafeAreaInsets();

  const handleConfirm = async () => {
    if (!claimerName.trim()) return;
    
    setLoading(true);
    try {
      await onConfirm(claimerName, claimerEmail);
      setClaimerName('');
      setClaimerEmail('');
    } catch (error) {
      console.error('Error claiming item:', error);
      Alert.alert('Error', 'Failed to claim item. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={{ flex: 1, backgroundColor: 'white', paddingTop: insets.top }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20 }}>
          <TouchableOpacity onPress={onClose} disabled={loading}>
            <Text style={{ fontSize: 16, color: '#6B7280' }}>Cancel</Text>
          </TouchableOpacity>
          <Text style={{ fontSize: 18, fontWeight: '600', color: '#111827' }}>
            Claim This Gift
          </Text>
          <TouchableOpacity 
            onPress={handleConfirm}
            disabled={loading || !claimerName.trim()}
            style={{ opacity: (loading || !claimerName.trim()) ? 0.5 : 1 }}
          >
            <Text style={{ fontSize: 16, color: '#3B82F6', fontWeight: '600' }}>
              {loading ? 'Claiming...' : 'Claim'}
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={{ flex: 1, padding: 20 }}>
          <Text style={{ fontSize: 14, color: '#6B7280', marginBottom: 24 }}>
            Claiming "{itemTitle}" will mark it as taken for other gifters, but the recipient won't see this status.
          </Text>

          <View style={{ marginBottom: 16 }}>
            <Text style={{ fontSize: 14, color: '#111827', marginBottom: 8 }}>
              Your name *
            </Text>
            <TextInput
              value={claimerName}
              onChangeText={setClaimerName}
              placeholder="Enter your name"
              style={{
                backgroundColor: '#F9FAFB',
                borderRadius: 16,
                padding: 16,
                fontSize: 14
              }}
            />
          </View>

          <View style={{ marginBottom: 16 }}>
            <Text style={{ fontSize: 14, color: '#111827', marginBottom: 8 }}>
              Your email (optional)
            </Text>
            <TextInput
              value={claimerEmail}
              onChangeText={setClaimerEmail}
              placeholder="Enter your email"
              keyboardType="email-address"
              style={{
                backgroundColor: '#F9FAFB',
                borderRadius: 16,
                padding: 16,
                fontSize: 14
              }}
            />
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

function ChipInModal({ visible, onClose, onConfirm, item, contributions }) {
  const [amount, setAmount] = useState('');
  const [contributorName, setContributorName] = useState('');
  const [contributorEmail, setContributorEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const insets = useSafeAreaInsets();

  // Calculate remaining amount
  const itemContributions = contributions.filter(c => c.item_id === item?.id);
  const raised = itemContributions.reduce((total, c) => total + parseFloat(c.amount), 0);
  const target = parseFloat(item?.group_gift_target) || 0;
  const remaining = target - raised;

  const handleConfirm = async () => {
    if (!contributorName.trim() || !amount || parseFloat(amount) <= 0) return;
    
    setLoading(true);
    try {
      await onConfirm(parseFloat(amount), contributorName, contributorEmail);
      setAmount('');
      setContributorName('');
      setContributorEmail('');
    } catch (error) {
      console.error('Error contributing to group gift:', error);
      Alert.alert('Error', 'Failed to contribute. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={{ flex: 1, backgroundColor: 'white', paddingTop: insets.top }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20 }}>
          <TouchableOpacity onPress={onClose} disabled={loading}>
            <Text style={{ fontSize: 16, color: '#6B7280' }}>Cancel</Text>
          </TouchableOpacity>
          <Text style={{ fontSize: 18, fontWeight: '600', color: '#111827' }}>
            Chip In for Group Gift
          </Text>
          <TouchableOpacity 
            onPress={handleConfirm}
            disabled={loading || !contributorName.trim() || !amount || parseFloat(amount) <= 0 || parseFloat(amount) > remaining}
            style={{ opacity: (loading || !contributorName.trim() || !amount || parseFloat(amount) <= 0 || parseFloat(amount) > remaining) ? 0.5 : 1 }}
          >
            <Text style={{ fontSize: 16, color: '#7C3AED', fontWeight: '600' }}>
              {loading ? 'Contributing...' : 'Contribute'}
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={{ flex: 1, padding: 20 }}>
          {item && (
            <>
              <View style={{
                backgroundColor: '#F9FAFB',
                borderRadius: 16,
                padding: 16,
                marginBottom: 24
              }}>
                <Text style={{ fontSize: 14, fontWeight: '500', color: '#111827', marginBottom: 4 }}>
                  {item.title || item.description}
                </Text>
                <Text style={{ fontSize: 12, color: '#6B7280' }}>
                  ${raised.toFixed(2)} raised of ${target.toFixed(2)} target
                </Text>
                <Text style={{ fontSize: 12, color: '#6B7280' }}>
                  ${remaining.toFixed(2)} remaining
                </Text>
              </View>

              <View style={{ marginBottom: 16 }}>
                <Text style={{ fontSize: 14, color: '#111827', marginBottom: 8 }}>
                  Your name *
                </Text>
                <TextInput
                  value={contributorName}
                  onChangeText={setContributorName}
                  placeholder="Enter your name"
                  style={{
                    backgroundColor: '#F9FAFB',
                    borderRadius: 16,
                    padding: 16,
                    fontSize: 14
                  }}
                />
              </View>

              <View style={{ marginBottom: 16 }}>
                <Text style={{ fontSize: 14, color: '#111827', marginBottom: 8 }}>
                  Your email (optional)
                </Text>
                <TextInput
                  value={contributorEmail}
                  onChangeText={setContributorEmail}
                  placeholder="Enter your email"
                  keyboardType="email-address"
                  style={{
                    backgroundColor: '#F9FAFB',
                    borderRadius: 16,
                    padding: 16,
                    fontSize: 14
                  }}
                />
              </View>

              <View style={{ marginBottom: 16 }}>
                <Text style={{ fontSize: 14, color: '#111827', marginBottom: 8 }}>
                  Your contribution *
                </Text>
                <View style={{ position: 'relative' }}>
                  <Text style={{
                    position: 'absolute',
                    left: 16,
                    top: 16,
                    fontSize: 14,
                    color: '#6B7280',
                    zIndex: 1
                  }}>
                    $
                  </Text>
                  <TextInput
                    value={amount}
                    onChangeText={setAmount}
                    placeholder="0.00"
                    keyboardType="decimal-pad"
                    style={{
                      backgroundColor: '#F9FAFB',
                      borderRadius: 16,
                      paddingLeft: 32,
                      paddingRight: 16,
                      paddingVertical: 16,
                      fontSize: 14
                    }}
                  />
                </View>
              </View>
            </>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

export default function PublicProfileScreen() {
  const { username } = useLocalSearchParams();
  const router = useRouter();
  const [wishlistItems, setWishlistItems] = useState([]);
  const [inventoryItems, setInventoryItems] = useState([]);
  const [contributions, setContributions] = useState([]);
  const [claims, setClaims] = useState([]);
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [showChipInModal, setShowChipInModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (username) {
      loadProfileData();
    }
  }, [username]);

  const loadProfileData = async () => {
    try {
      setLoading(true);
      
      // Get user info
      const userResponse = await fetch(`/api/users/${username}`);
      if (!userResponse.ok) {
        throw new Error('User not found');
      }
      const userData = await userResponse.json();
      setUser(userData);
      
      // Get user's items
      const itemsResponse = await fetch(`/api/items?username=${username}`);
      if (itemsResponse.ok) {
        const items = await itemsResponse.json();
        setWishlistItems(items.filter(item => item.item_type === 'wishlist'));
        setInventoryItems(items.filter(item => item.item_type === 'inventory'));
      }
      
      // Get claims and contributions for this user
      const [claimsResponse, contributionsResponse] = await Promise.all([
        fetch(`/api/claims?username=${username}`),
        fetch(`/api/contributions?username=${username}`)
      ]);
      
      if (claimsResponse.ok) {
        const claimsData = await claimsResponse.json();
        setClaims(claimsData);
      }
      
      if (contributionsResponse.ok) {
        const contributionsData = await contributionsResponse.json();
        setContributions(contributionsData);
      }
    } catch (error) {
      console.error('Error loading profile data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClaim = (itemId) => {
    const item = wishlistItems.find(i => i.id === itemId);
    setSelectedItem(item);
    setShowClaimModal(true);
  };

  const confirmClaim = async (claimerName, claimerEmail) => {
    if (!selectedItem) return;
    
    try {
      const response = await fetch('/api/claims', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          item_id: selectedItem.id,
          claimer_name: claimerName,
          claimer_email: claimerEmail
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to claim item');
      }

      const newClaim = await response.json();
      setClaims(prev => [...prev, newClaim]);
      setShowClaimModal(false);
      setSelectedItem(null);
      Alert.alert('Success', 'Gift claimed successfully!');
    } catch (error) {
      console.error('Error claiming item:', error);
      throw error;
    }
  };

  const handleChipIn = (itemId) => {
    const item = wishlistItems.find(i => i.id === itemId);
    setSelectedItem(item);
    setShowChipInModal(true);
  };

  const confirmChipIn = async (amount, contributorName, contributorEmail) => {
    if (!selectedItem) return;
    
    try {
      const response = await fetch('/api/contributions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          item_id: selectedItem.id,
          contributor_name: contributorName,
          contributor_email: contributorEmail,
          amount: amount
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to contribute to group gift');
      }

      const newContribution = await response.json();
      setContributions(prev => [...prev, newContribution]);
      setShowChipInModal(false);
      setSelectedItem(null);
      Alert.alert('Success', 'Contribution added successfully!');
    } catch (error) {
      console.error('Error contributing to group gift:', error);
      throw error;
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#F9FAFB', justifyContent: 'center', alignItems: 'center' }}>
        <StatusBar style="dark" />
        <View style={{
          width: 32,
          height: 32,
          backgroundColor: '#3B82F6',
          borderRadius: 16,
          marginBottom: 16
        }} />
        <Text style={{ fontSize: 16, color: '#6B7280' }}>
          Loading {username}'s profile...
        </Text>
      </View>
    );
  }

  if (!user) {
    return (
      <View style={{ flex: 1, backgroundColor: '#F9FAFB', justifyContent: 'center', alignItems: 'center' }}>
        <StatusBar style="dark" />
        <View style={{
          width: 64,
          height: 64,
          backgroundColor: '#D1D5DB',
          borderRadius: 32,
          marginBottom: 16
        }} />
        <Text style={{ fontSize: 20, fontWeight: '600', color: '#111827', marginBottom: 8 }}>
          Profile Not Found
        </Text>
        <Text style={{ fontSize: 16, color: '#6B7280', textAlign: 'center', paddingHorizontal: 32 }}>
          The profile for "{username}" doesn't exist or has been removed.
        </Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#F9FAFB' }}>
      <StatusBar style="dark" />
      
      {/* Header */}
      <View style={{
        backgroundColor: 'white',
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
        paddingTop: insets.top,
        paddingHorizontal: 20,
        paddingBottom: 20
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
          <View style={{
            width: 40,
            height: 40,
            backgroundColor: '#3B82F6',
            borderRadius: 20,
            justifyContent: 'center',
            alignItems: 'center'
          }}>
            <Gift size={20} color="white" />
          </View>
          <View>
            <Text style={{ fontSize: 24, fontWeight: '600', color: '#111827' }}>
              {user.full_name || username}'s Wishlist
            </Text>
            <Text style={{ fontSize: 14, color: '#6B7280' }}>
              Choose a perfect gift from their wishlist
            </Text>
          </View>
        </View>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}>
        <View style={{ padding: 20 }}>
          {/* What They Want */}
          <View style={{ marginBottom: 32 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <Text style={{ fontSize: 20, fontWeight: '600', color: '#111827' }}>
                What They Want
              </Text>
              <View style={{
                backgroundColor: '#F3F4F6',
                paddingHorizontal: 12,
                paddingVertical: 4,
                borderRadius: 16
              }}>
                <Text style={{ fontSize: 12, color: '#6B7280' }}>
                  {wishlistItems.length}
                </Text>
              </View>
            </View>
            
            {wishlistItems.length === 0 ? (
              <View style={{
                backgroundColor: 'white',
                borderRadius: 24,
                padding: 32,
                alignItems: 'center'
              }}>
                <Text style={{ fontSize: 16, color: '#6B7280', textAlign: 'center' }}>
                  {user.full_name || username} hasn't added any wishlist items yet.
                </Text>
              </View>
            ) : (
              wishlistItems.map((item) => (
                <GifterItemCard 
                  key={item.id} 
                  item={item} 
                  onClaim={handleClaim}
                  onChipIn={handleChipIn}
                  contributions={contributions}
                  claims={claims}
                />
              ))
            )}
          </View>

          {/* What They Own */}
          <View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <Text style={{ fontSize: 20, fontWeight: '600', color: '#111827' }}>
                What They Already Own
              </Text>
              <View style={{
                backgroundColor: '#F3F4F6',
                paddingHorizontal: 12,
                paddingVertical: 4,
                borderRadius: 16
              }}>
                <Text style={{ fontSize: 12, color: '#6B7280' }}>
                  {inventoryItems.length}
                </Text>
              </View>
            </View>
            
            {inventoryItems.length === 0 ? (
              <View style={{
                backgroundColor: 'white',
                borderRadius: 24,
                padding: 32,
                alignItems: 'center'
              }}>
                <Text style={{ fontSize: 16, color: '#6B7280', textAlign: 'center' }}>
                  {user.full_name || username} hasn't added any inventory items yet.
                </Text>
              </View>
            ) : (
              inventoryItems.map((item) => (
                <InventoryItemCard key={item.id} item={item} />
              ))
            )}
            
            {inventoryItems.length > 0 && (
              <View style={{
                backgroundColor: '#EBF8FF',
                borderRadius: 16,
                padding: 16,
                marginTop: 16
              }}>
                <Text style={{ fontSize: 14, color: '#1E40AF' }}>
                  💡 These items show what {user.full_name || username} already owns, so you can avoid duplicate gifts and choose complementary items instead.
                </Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      <ClaimModal
        visible={showClaimModal}
        onClose={() => setShowClaimModal(false)}
        onConfirm={confirmClaim}
        itemTitle={selectedItem?.title || selectedItem?.description || ''}
      />

      <ChipInModal
        visible={showChipInModal}
        onClose={() => setShowChipInModal(false)}
        onConfirm={confirmChipIn}
        item={selectedItem}
        contributions={contributions}
      />
    </View>
  );
}
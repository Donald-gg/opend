import Principal "mo:base/Principal";
import NFTActorClass "../nft/nft";
import Cycles "mo:base/ExperimentalCycles";
import Debug "mo:base/Debug";
import HashMap "mo:base/HashMap";
import List "mo:base/List";
import Text "mo:base/Text";
import Iter "mo:base/Iter";

actor OpenD {

    // custom type for mapOfListings
    private type Listing = {
        itemOwner : Principal;
        itemPrice : Nat;
    };

    var mapOfNFTs = HashMap.HashMap<Principal, NFTActorClass.NFT>(1, Principal.equal, Principal.hash);
    var mapOfOwners = HashMap.HashMap<Principal, List.List<Principal>>(1, Principal.equal, Principal.hash);
    var mapOfListings = HashMap.HashMap<Principal, Listing>(1, Principal.equal, Principal.hash);

    public shared (msg) func mint(imgData : [Nat8], name : Text) : async Principal {
        let owner : Principal = msg.caller;
        Debug.print(debug_show (Cycles.balance()));
        Cycles.add(100_500_000_000);
        let newNFT = await NFTActorClass.NFT(name, owner, imgData);
        Debug.print(debug_show (Cycles.balance()));
        let newNFTPrincipal = await newNFT.getCanisterId();

        mapOfNFTs.put(newNFTPrincipal, newNFT);
        addToOwnershipMap(owner, newNFTPrincipal);
        return newNFTPrincipal;
    };

    private func addToOwnershipMap(owner : Principal, nftId : Principal) {
        var ownedNFTs : List.List<Principal> = checkOwned(owner);
        ownedNFTs := List.push(nftId, ownedNFTs);
        mapOfOwners.put(owner, ownedNFTs);

    };

    public query func getOwnerNFTs(user : Principal) : async [Principal] {
        var ownedNFTs : List.List<Principal> = checkOwned(user);
        return List.toArray(ownedNFTs);
    };

    private func checkOwned(owner : Principal) : List.List<Principal> {
        switch (mapOfOwners.get(owner)) {
            case null List.nil<Principal>();
            case (?result) result;
        };
    };

    public shared (msg) func listItem(id : Principal, price : Nat) : async Text {

        var item : NFTActorClass.NFT = switch (mapOfNFTs.get(id)) {
            case null return "NFT does not exist.";
            case (?result) result;
        };

        let owner = await item.getOwner();
        if (Principal.equal(owner, msg.caller)) {
            let newListing : Listing = {
                itemOwner = owner;
                itemPrice = price;
            };
            mapOfListings.put(id, newListing);
            return "Success";

        } else {
            return "Unautherized";
        };

    };

    public func getOpenDCanisterID() : async Principal {
        return Principal.fromActor(OpenD);
    };

    public query func isListed(id : Principal) : async Bool {
        let listing = switch (mapOfListings.get(id)) {
            case null false;
            case (?result) true;
        };
        return listing;
    };

    public query func getListedNFTs() : async [Principal] {
        return Iter.toArray(mapOfListings.keys());
    };

    public query func getOriginalOwner(id : Principal) : async Principal {
        let listing : Listing = switch (mapOfListings.get(id)) {
            case null return Principal.fromText("");
            case (?result) result;
        };

        return listing.itemOwner;
    };

    public query func getListedPrice(id : Principal) : async Nat {
        let listing : Listing = switch (mapOfListings.get(id)) {
            case null return 0;
            case (?result) result;
        };

        return listing.itemPrice;
    };

    public shared (msg) func completePurchase(id : Principal, ownerId : Principal, newOwnerId : Principal) : async Text {
        let NFT : NFTActorClass.NFT = switch (mapOfNFTs.get(id)) {
            case null return "NFT does not exist.";
            case (?result) result;
        };

        let transferResult = await NFT.transferOwnership(newOwnerId);
        if (transferResult == "Success") {
            mapOfListings.delete(id);
            var ownerNFTs : List.List<Principal> = switch (mapOfOwners.get(ownerId)) {
                case null List.nil<Principal>();
                case (?result) result;
            };
            ownerNFTs := List.filter(
                ownerNFTs,
                func(listItemId : Principal) : Bool {
                    return listItemId != id;
                },
            );
            addToOwnershipMap(newOwnerId, id);

            return "Success";
        } else {
            return transferResult;
        };

    };
};

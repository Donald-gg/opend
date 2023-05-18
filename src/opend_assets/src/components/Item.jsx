import React, { useEffect, useState } from "react";
import { Actor, HttpAgent } from "@dfinity/agent";
import { idlFactory } from '../../../declarations/nft';
import { idlFactory as tokenIdlFactory } from '../../../declarations/token';
import { opend } from '../../../declarations/opend/index';
import Button from './Button';
import { useLocation } from 'react-router-dom'
import CURRENT_USER_ID from '../index';
import Pricelabel from './Pricelabel';
import { Principal } from "@dfinity/principal";

function Item(props) {
  const id = props.id
  const [name, setName] = useState("")
  const [owner, setOwner] = useState("")
  const [image, setImage] = useState("")
  const localhost = "http://localhost:8080/";
  const agent = new HttpAgent({ host: localhost });
  const [priceInput, setPriceInput] = useState(false)
  const [price, setPrice] = useState("")
  const [loaderHidden, setloaderHidden] = useState(true)
  const [disableBtn, setDisableBtn] = useState(false)
  const [blur, setBlur] = useState({})
  const location = useLocation()
  const [buyBtn, setBuyBtn] = useState(false)
  const [buyPrice, setBuyPrice] = useState(0)
  const [originalOwner, setOriginalOwner] = useState("")
  const [shouldDisplay, setShouldDisplay] = useState(true)
  async function NFT_Actor(idlFactory, agent, id) {
    agent.fetchRootKey()
    const NFTActor = await Actor.createActor(idlFactory, {
      agent,
      canisterId: id,
    })

    return NFTActor;
  }

  async function loadNFT() {

    const NFTActor = await NFT_Actor(idlFactory, agent, id);

    const name = await NFTActor.getName()
    setName(name)

    const owner = await NFTActor.getOwner()
    setOwner(owner.toText())

    const imageData = await NFTActor.getAsset()
    const imageContent = new Uint8Array(imageData)
    const image = URL.createObjectURL(
      new Blob([imageContent.buffer], { type: "image/png" })
    )
    setImage(image)

    const isListed = await opend.isListed(id);
    if (location.pathname === "/collection") {

      if (isListed) {
        setBlur({ filter: "blur(4px)" })
        setDisableBtn(true)
        setOwner("openD")
      }
    } else if (location.pathname === "/discover") {
      setBlur({ filter: "blur(0)" })
      setDisableBtn(true)
      setOwner("openD")
      const originalOwner = await opend.getOriginalOwner(id)
      setOriginalOwner(originalOwner.toText())
      if (originalOwner.toText() !== CURRENT_USER_ID.toText()) {
        setBuyBtn(true)
      }
      const getPrice = await opend.getListedPrice(id)
      setBuyPrice(getPrice.toString())
    }
  }

  function handleSell() {
    setPriceInput(true)

  }

  async function sellItem() {
    try {
      setloaderHidden(false)
      console.log(price)
      if (price.length <= 0 && isNAN(price)) {
        throw new Error("Not allowed")
      }
      const msg = await opend.listItem(id, Number(price));
      if (msg === "Success") {
        const openDId = await opend.getOpenDCanisterID();

        const NFTActor = await NFT_Actor(idlFactory, agent, id);
        const res = await NFTActor.transferOwnership(openDId);
        if (res === "Success") {
          setBlur({ filter: "blur(4px)" })
          setDisableBtn(true)
          setOwner("openD")
        }
        setloaderHidden(true)
      }


    } catch (error) {
      console.log(error.message)
    }
  }


  async function buyItem() {
    console.log("buy clicked")
    setloaderHidden(false)
    const tokenActor = await NFT_Actor(tokenIdlFactory, agent, Principal.fromText("rrkah-fqaaa-aaaaa-aaaaq-cai"));
    const msg = await tokenActor.transferTo(Principal.fromText(originalOwner), Number(buyPrice))
    if (msg === "Success") {
      const msg = await opend.completePurchase(id, Principal.fromText(originalOwner), CURRENT_USER_ID);
      console.log(msg)
      setloaderHidden(true)
      setShouldDisplay(false)
    }
  }


  useEffect(() => {
    loadNFT()
  }, [])

  return (
    <div style={{ display: shouldDisplay ? "inline" : "none" }} className="disGrid-item">
      <div className="disPaper-root disCard-root makeStyles-root-17 disPaper-elevation1 disPaper-rounded">
        <img
          className="disCardMedia-root makeStyles-image-19 disCardMedia-media disCardMedia-img"
          src={image} style={blur}
        />
        <div className="lds-ellipsis" hidden={loaderHidden}>
          <div></div>
          <div></div>
          <div></div>
          <div></div>
        </div>
        <div className="disCardContent-root">
          {location.pathname === "/discover" ? <Pricelabel price={buyPrice} /> : ""}
          <h2 className="disTypography-root makeStyles-bodyText-24 disTypography-h5 disTypography-gutterBottom">
            {name}<span className="purple-text"> {disableBtn && location.pathname === "/collection" ? "Listed" : ""}</span>
          </h2>
          <p className="disTypography-root makeStyles-bodyText-24 disTypography-body2 disTypography-colorTextSecondary">
            Owner: {owner}
          </p>
          {!disableBtn ? priceInput ?
            <>
              <input
                placeholder="Price in DANG"
                type="number"
                className="price-input"
                value={price}
                onChange={e => setPrice(e.target.value)}
              />
              <Button handleClick={sellItem} text="Confirm" />
            </>
            : <Button handleClick={handleSell} text="Sell" /> : ""}
          {buyBtn ? priceInput ?

            <Button handleClick={buyItem} text="Confirm" />

            : <Button handleClick={handleSell} text="Buy" /> : ""}
        </div>
      </div>
    </div>
  );
}

export default Item;


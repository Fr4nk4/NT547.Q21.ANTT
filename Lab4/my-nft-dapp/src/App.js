// src/App.js
import { useState } from 'react';
import { ethers } from 'ethers';
import MyNFT_ABI from './utils/MyNFT.json';
import './App.css';

// ==================================================================
// !!! CẬP NHẬT 2 GIÁ TRỊ NÀY !!!
// Dán địa chỉ hợp đồng của SV từ Bước 1.3
// const contractAddress = "0xF2deAD8f8Eb2Ce00241B1A047e1414E9ACE25407"; 
// Dán địa chỉ hợp đồng của SV từ Bước 3.1
// const contractAddress = "0x886D50db6F70Da2A1b89A2E4edcE14C06710469c";
// Dán địa chỉ hợp đồng của SV từ Bước 3.4
const contractAddress = "0xcaaEEb90096e3E9a96d139969f988363aB2687e8";

// Dán URL metadata của SV từ Bước 1.1
const metadataURI = "https://gateway.pinata.cloud/ipfs/bafkreicyxfrwyi445cqjrrlwap5m55f7l4wsuoyhnpz23ui323ry6fom4m";
// ==================================================================

function App() {
  const [walletAddress, setWalletAddress] = useState(null);
  const [mintingStatus, setMintingStatus] = useState(null);
  const [txHash, setTxHash] = useState(null);
  // lưu tokenId người dùng nhập
  const [tokenIdInput, setTokenIdInput] = useState("");

  // lưu dữ liệu NFT (name, description, image)
  const [nftData, setNftData] = useState(null);

  // trạng thái loading
  const [loadingNFT, setLoadingNFT] = useState(false);
  // danh sách NFT của user
  const [userNFTs, setUserNFTs] = useState([]);

  // loading
  const [loadingNFTList, setLoadingNFTList] = useState(false);

  async function connectWallet() {
    if (typeof window.ethereum !== 'undefined') {
      console.log('MetaMask is installed!');
      try {
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        console.log('Connected account:', accounts[0]);
        setWalletAddress(accounts[0]);
      } catch (error) {
        console.error('User denied account access', error);
      }
    } else {
      console.log('Please install MetaMask!');
      alert('Please install MetaMask!');
    }
  }

  async function handleMint() {
    if (!walletAddress) {
      alert("Please connect your wallet first.");
      return;
    }
    
    if (typeof window.ethereum !== 'undefined') {
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();
      const nftContract = new ethers.Contract(contractAddress, MyNFT_ABI, signer);

      try {
        setMintingStatus('Minting... Vui lòng xác nhận giao dịch trên MetaMask.');
        setTxHash(null);
        //code cũ
        // const tx = await nftContract.safeMint(walletAddress, metadataURI);

        // chuyển 0.01 ETH sang đơn vị Wei (đơn vị nhỏ nhất)
        const mintFee = ethers.utils.parseEther("0.01");
        // gọi hàm safeMint và gửi kèm ETH
        const tx = await nftContract.safeMint(walletAddress, metadataURI, { 
            value: mintFee // số ETH gửi kèm giao dịch
        });
        console.log('Transaction sent:', tx.hash);
        
        setMintingStatus('Đang chờ giao dịch được xác nhận...');
        await tx.wait();
        
        console.log('Transaction confirmed!');
        setMintingStatus('Mint thành công!');
        setTxHash(tx.hash);

      } catch (error) {
        console.error('Minting failed:', error);
        setMintingStatus(`Mint thất bại: ${error.message}`);
      }
    }
  }
  async function fetchNFT() {
    // kiểm tra input
    if (tokenIdInput === "") {
      alert("Nhập tokenId!");
      return;
    }

    try {
      setLoadingNFT(true);

      // tạo provider (chỉ đọc blockchain, không cần signer)
      const provider = new ethers.providers.Web3Provider(window.ethereum);

      // tạo instance contract
      const nftContract = new ethers.Contract(
        contractAddress,
        MyNFT_ABI,
        provider
      );

      // ================== BƯỚC 1 ==================
      // gọi hàm tokenURI từ smart contract
      const tokenURI = await nftContract.tokenURI(tokenIdInput);

      console.log("Token URI:", tokenURI);

      // ================== BƯỚC 2 ==================
      // chuyển ipfs:// → https gateway
      const httpURL = tokenURI.replace(
        "ipfs://",
        "https://gateway.pinata.cloud/ipfs/"
      );

      // ================== BƯỚC 3 ==================
      // fetch metadata JSON
      const response = await fetch(httpURL);

      const data = await response.json();

      console.log("Metadata:", data);

      // ================== BƯỚC 4 ==================
      // xử lý ảnh IPFS
      let imageURL = data.image;

      if (imageURL.startsWith("ipfs://")) {
        imageURL = imageURL.replace(
          "ipfs://",
          "https://gateway.pinata.cloud/ipfs/"
        );
      }

      // lưu dữ liệu NFT
      setNftData({
        name: data.name,
        description: data.description,
        image: imageURL
      });

    } catch (error) {
      console.error("Lỗi fetch NFT:", error);
      alert("Không tìm thấy NFT hoặc tokenId sai!");
    }

    setLoadingNFT(false);
  }
  async function fetchUserNFTs() {

    // kiểm tra đã connect ví chưa
    if (!walletAddress) {
      alert("Connect wallet trước!");
      return;
    }

    try {
      setLoadingNFTList(true);

      // tạo provider
      const provider = new ethers.providers.Web3Provider(window.ethereum);

      // tạo contract (chỉ đọc)
      const nftContract = new ethers.Contract(
        contractAddress,
        MyNFT_ABI,
        provider
      );

      // ================== BƯỚC 1 ==================
      // lấy số NFT user sở hữu
      const balance = await nftContract.balanceOf(walletAddress);

      console.log("Số NFT:", balance.toString());

      let nftArray = [];

      // ================== BƯỚC 2 ==================
      // lặp qua từng NFT
      for (let i = 0; i < balance; i++) {

        // lấy tokenId theo index
        const tokenId = await nftContract.tokenOfOwnerByIndex(walletAddress, i);

        console.log("TokenId:", tokenId.toString());

        // ================== BƯỚC 3 ==================
        // lấy tokenURI
        const tokenURI = await nftContract.tokenURI(tokenId);

        // chuyển IPFS → HTTP
        const httpURL = tokenURI.replace(
          "ipfs://",
          "https://gateway.pinata.cloud/ipfs/"
        );

        // fetch metadata
        const response = await fetch(httpURL);
        const data = await response.json();

        // xử lý image
        let imageURL = data.image;

        if (imageURL.startsWith("ipfs://")) {
          imageURL = imageURL.replace(
            "ipfs://",
            "https://gateway.pinata.cloud/ipfs/"
          );
        }

        // push vào array
        nftArray.push({
          tokenId: tokenId.toString(),
          name: data.name,
          description: data.description,
          image: imageURL
        });
      }

      // lưu vào state
      setUserNFTs(nftArray);

    } catch (error) {
      console.error("Lỗi fetch NFT list:", error);
    }

    setLoadingNFTList(false);
  }

  return (
    <div className="App">
      <header className="App-header">
        <h1>My NFT DApp</h1>
        
        <button onClick={connectWallet} className="connect-button">
          {walletAddress 
            ? `Connected: ${walletAddress.substring(0, 6)}...${walletAddress.substring(38)}` 
            : 'Connect Wallet'}
        </button>

        {walletAddress && (
          <>
            <div className="mint-container">
              <button onClick={handleMint} className="mint-button">Mint My NFT</button>
              {mintingStatus && <p className="status-text">{mintingStatus}</p>}
              {txHash && (
                <p className="tx-link">
                  Xem giao dịch: 
                  <a href={`https://sepolia.etherscan.io/tx/${txHash}`} target="_blank" rel="noopener noreferrer">Etherscan</a>
                </p>
              )}
            </div>

            <div style={{ marginTop: "40px" }}>

              <h2>Xem thông tin NFT</h2>

              {/* input nhập tokenId */}
              <input
                type="text"
                placeholder="Nhập tokenId"
                value={tokenIdInput}
                onChange={(e) => setTokenIdInput(e.target.value)}
              />

              {/* nút fetch */}
              <button onClick={fetchNFT}>
                Xem NFT
              </button>

              {/* loading */}
              {loadingNFT && <p>Đang tải...</p>}

              {/* hiển thị NFT */}
                {nftData && (
                  <div style={{ marginTop: "20px" }}>
                    
                    <h3>{nftData.name}</h3>

                    <p>{nftData.description}</p>

                    <img
                      src={nftData.image}
                      alt="NFT"
                      width="200"
                    />

                  </div>
              )}

            </div>

            <div className="mint-container">

              <h2>Bộ sưu tập của bạn</h2>

              <button onClick={fetchUserNFTs} className="mint-button">
                Tải NFT của tôi
              </button>

              {loadingNFTList && <p>Đang tải...</p>}

              <div style={{ display: "flex", gap: "20px", flexWrap: "wrap" }}>

                {userNFTs.map((nft, index) => (
                  <div key={index} style={{ border: "1px solid white", padding: "10px" }}>
                    
                    <h4>#{nft.tokenId}</h4>

                    <h3>{nft.name}</h3>

                    <p>{nft.description}</p>

                    <img src={nft.image} alt={nft.name} width="150" />

                  </div>
                ))}

              </div>
            </div>
          </>
        )}
      </header>
    </div>
  );
}

export default App;
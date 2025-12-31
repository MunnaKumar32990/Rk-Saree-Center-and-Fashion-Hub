import { useParams } from "react-router-dom";
import api from "../services/api";

const Payment = () => {
  const { orderId } = useParams();
  const userInfo = JSON.parse(localStorage.getItem("userInfo"));

  const payNow = async () => {
    const { data } = await api.post(
      "/payment/create",
      { amount: 100 }, // example
      {
        headers: {
          Authorization: `Bearer ${userInfo.token}`,
        },
      }
    );

    const options = {
      key: "RAZORPAY_KEY_ID",
      amount: data.amount,
      currency: "INR",
      order_id: data.id,
      handler: async function (response) {
        await api.post(
          "/payment/verify",
          {
            ...response,
            orderId,
          },
          {
            headers: {
              Authorization: `Bearer ${userInfo.token}`,
            },
          }
        );
        window.location.href = "/success";
      },
    };

    const razor = new window.Razorpay(options);
    razor.open();
  };

  return (
    <div style={{ padding: "30px" }}>
      <h2>Complete Payment</h2>
      <button onClick={payNow}>Pay Now</button>
    </div>
  );
};

export default Payment;

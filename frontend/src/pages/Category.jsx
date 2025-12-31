import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import api from "../services/api";

const Category = () => {
  const { categoryName } = useParams();
  const [products, setProducts] = useState([]);

  useEffect(() => {
    const fetchCategoryProducts = async () => {
      try {
        const { data } = await api.get("/products");
        const filtered = data.filter(
          (product) => product.category === categoryName
        );
        setProducts(filtered);
      } catch (error) {
        console.error("Error fetching category products:", error);
      }
    };

    fetchCategoryProducts();
  }, [categoryName]);

  return (
    <div className="p-8">
      <h2 className="text-2xl font-bold mb-6 capitalize">{categoryName} Collection</h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {products.map((product) => (
          <Link 
            key={product._id} 
            to={`/product/${product._id}`}
            className="block no-underline text-inherit"
          >
            {/* New Product Card JSX */}
            <div className="border rounded-lg overflow-hidden shadow hover:shadow-lg transition bg-white h-full">
              <img
                src={product.image}
                alt={product.name}
                className="w-full h-64 object-cover"
              />
              <div className="p-4">
                <h3 className="font-semibold text-lg">{product.name}</h3>
                <p className="text-gray-600 mt-1">₹{product.price}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default Category;
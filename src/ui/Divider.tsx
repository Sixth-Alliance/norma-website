type DividerType = {
  className?: string;
};

const Divider = ({ className }: DividerType) => {
  return (
    <div
      className={`border-t-2 border-[#EAEAEA] w-full my-5 ${className}`}
    ></div>
  );
};

export default Divider;

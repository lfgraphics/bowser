import { Loader2 } from 'lucide-react'

const Loading = () => {
    return (
        <div className="z-50 fixed inset-0 flex justify-center items-center bg-black bg-opacity-50 max-w-full max-h-full">
            <Loader2 className="w-10 h-10 text-white animate-spin" />
        </div>
    )
}

export default Loading;